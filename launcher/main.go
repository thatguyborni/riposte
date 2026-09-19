// Riposte — desktop launcher.
//
// Opens the game in its own window using the WebView2 engine built into
// Windows 11. The game page is served from 127.0.0.1 so saves live in a
// stable place (%APPDATA%\Riposte). If a riposte.html sits next to the exe
// it is used instead of the built-in copy, and the game reloads itself when
// that file changes — that is how updates arrive.
package main

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
)

//go:embed riposte.html
var builtin []byte

const port = 47815

// set at build time from the game's VERSION
var appVersion = "0.0.0"

const defaultRepo = "thatguyborni/riposte"

var verRe = regexp.MustCompile(`const VERSION = "(\d+)\.(\d+)\.(\d+)"`)

func parseVer(s string) [3]int {
	var v [3]int
	s = strings.TrimPrefix(strings.TrimSpace(s), "v")
	for i, p := range strings.SplitN(s, ".", 3) {
		n, _ := strconv.Atoi(strings.TrimFunc(p, func(r rune) bool { return r < '0' || r > '9' }))
		v[i] = n
	}
	return v
}
func newer(a, b [3]int) bool {
	for i := 0; i < 3; i++ {
		if a[i] != b[i] {
			return a[i] > b[i]
		}
	}
	return false
}
func htmlVer(b []byte) [3]int {
	m := verRe.FindSubmatch(b)
	if m == nil {
		return [3]int{}
	}
	return parseVer(string(m[1]) + "." + string(m[2]) + "." + string(m[3]))
}
func validPage(b []byte) bool {
	return len(b) > 50000 && bytes.Contains(b, []byte("</html>")) && verRe.Match(b)
}

// the newest copy of the game wins: next to the exe, the updater's copy, or the built-in one
func gamePaths(dir string) []string {
	return []string{filepath.Join(dir, "riposte.html"), filepath.Join(os.Getenv("APPDATA"), "Riposte", "riposte.html")}
}
func bestPage(dir string) []byte {
	best, bv := builtin, htmlVer(builtin)
	for _, p := range gamePaths(dir) {
		if b, err := os.ReadFile(p); err == nil && validPage(b) {
			if v := htmlVer(b); newer(v, bv) || (v == bv && len(b) > 1000) {
				best, bv = b, v
			}
		}
	}
	return best
}

// ---- updater: checks GitHub releases for a newer riposte.html (and exe) ----
type ghRelease struct {
	Tag    string `json:"tag_name"`
	Draft  bool   `json:"draft"`
	Assets []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
	} `json:"assets"`
}

func fetch(url string) ([]byte, error) {
	c := &http.Client{Timeout: 60 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Riposte-Updater/"+appVersion)
	req.Header.Set("Accept", "application/vnd.github+json")
	res, err := c.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, io.ErrUnexpectedEOF
	}
	return io.ReadAll(io.LimitReader(res.Body, 64<<20))
}

func writeAtomic(path string, b []byte) error {
	tmp := path + ".download"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func checkUpdates(dir, exe string) {
	repo := defaultRepo
	if b, err := os.ReadFile(filepath.Join(dir, "update.cfg")); err == nil {
		v := strings.TrimSpace(string(b))
		if v == "off" {
			return
		}
		if strings.Count(v, "/") == 1 {
			repo = v
		}
	}
	body, err := fetch("https://api.github.com/repos/" + repo + "/releases/latest")
	if err != nil {
		return
	}
	var rel ghRelease
	if json.Unmarshal(body, &rel) != nil || rel.Draft {
		return
	}
	tag := parseVer(rel.Tag)
	for _, a := range rel.Assets {
		switch strings.ToLower(a.Name) {
		case "riposte.html":
			if !newer(tag, htmlVer(bestPage(dir))) {
				continue
			}
			b, err := fetch(a.URL)
			if err != nil || !validPage(b) || !newer(htmlVer(b), htmlVer(bestPage(dir))) {
				continue
			}
			// the running game notices the new file and reloads itself at a safe moment
			if writeAtomic(filepath.Join(dir, "riposte.html"), b) != nil {
				ad := filepath.Join(os.Getenv("APPDATA"), "Riposte")
				os.MkdirAll(ad, 0o755)
				writeAtomic(filepath.Join(ad, "riposte.html"), b)
			}
		case "riposte.exe":
			if !newer(tag, parseVer(appVersion)) {
				continue
			}
			b, err := fetch(a.URL)
			if err != nil || len(b) < 1<<20 || !bytes.HasPrefix(b, []byte("MZ")) {
				continue
			}
			// Windows lets a running exe be renamed: park the old one, drop the new one in.
			old := exe + ".old"
			os.Remove(old)
			if os.WriteFile(exe+".new", b, 0o755) != nil {
				continue
			}
			if os.Rename(exe, old) == nil {
				if os.Rename(exe+".new", exe) != nil {
					os.Rename(old, exe)
				}
			}
		}
	}
}

var (
	user32              = syscall.NewLazyDLL("user32.dll")
	pGetWindowLongPtrW  = user32.NewProc("GetWindowLongPtrW")
	pSetWindowLongPtrW  = user32.NewProc("SetWindowLongPtrW")
	pSetWindowPos       = user32.NewProc("SetWindowPos")
	pMonitorFromWindow  = user32.NewProc("MonitorFromWindow")
	pGetMonitorInfoW    = user32.NewProc("GetMonitorInfoW")
	pGetWindowPlacement = user32.NewProc("GetWindowPlacement")
	pSetWindowPlacement = user32.NewProc("SetWindowPlacement")
	pMessageBoxW        = user32.NewProc("MessageBoxW")
)

const (
	gwlStyle        = ^uintptr(15) // -16
	wsOverlappedWin = 0x00CF0000
	wsPopup         = 0x80000000
	wsVisible       = 0x10000000
	swpFrameChanged = 0x0020
	swpNoOwnerZ     = 0x0200
	swpNoZOrder     = 0x0004
	swpNoMove       = 0x0002
	swpNoSize       = 0x0001
)

type rect struct{ L, T, R, B int32 }
type monitorInfo struct {
	Size    uint32
	Monitor rect
	Work    rect
	Flags   uint32
}
type windowPlacement struct {
	Length, Flags, ShowCmd uint32
	MinPos, MaxPos         [2]int32
	Normal                 rect
	Device                 rect
}

var (
	fullscreen bool
	savedStyle uintptr
	savedPlace windowPlacement
)

func toggleFullscreen(hwnd uintptr) {
	if !fullscreen {
		savedStyle, _, _ = pGetWindowLongPtrW.Call(hwnd, gwlStyle)
		savedPlace.Length = uint32(unsafe.Sizeof(savedPlace))
		pGetWindowPlacement.Call(hwnd, uintptr(unsafe.Pointer(&savedPlace)))
		mon, _, _ := pMonitorFromWindow.Call(hwnd, 2)
		var mi monitorInfo
		mi.Size = uint32(unsafe.Sizeof(mi))
		pGetMonitorInfoW.Call(mon, uintptr(unsafe.Pointer(&mi)))
		pSetWindowLongPtrW.Call(hwnd, gwlStyle, (savedStyle&^wsOverlappedWin)|wsPopup|wsVisible)
		pSetWindowPos.Call(hwnd, 0, uintptr(mi.Monitor.L), uintptr(mi.Monitor.T),
			uintptr(mi.Monitor.R-mi.Monitor.L), uintptr(mi.Monitor.B-mi.Monitor.T), swpNoOwnerZ|swpFrameChanged)
		fullscreen = true
		return
	}
	pSetWindowLongPtrW.Call(hwnd, gwlStyle, savedStyle)
	pSetWindowPlacement.Call(hwnd, uintptr(unsafe.Pointer(&savedPlace)))
	pSetWindowPos.Call(hwnd, 0, 0, 0, 0, 0, swpNoMove|swpNoSize|swpNoZOrder|swpNoOwnerZ|swpFrameChanged)
	fullscreen = false
}

func alert(msg string) {
	t, _ := syscall.UTF16PtrFromString("Riposte")
	m, _ := syscall.UTF16PtrFromString(msg)
	pMessageBoxW.Call(0, uintptr(unsafe.Pointer(m)), uintptr(unsafe.Pointer(t)), 0x10)
}

// Earlier builds used Edge app-mode shortcuts named "Riposte". Point any of
// those at this exe instead, so the Start menu and desktop open the real
// program. Shortcuts that don't target Edge/Chrome with Riposte are left alone.
func fixOldShortcuts(exe string) {
	ps := `$exe = $env:RIPOSTE_EXE
$ws = New-Object -ComObject WScript.Shell
foreach ($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  $p = Join-Path $d 'Riposte.lnk'
  if (Test-Path $p) {
    $l = $ws.CreateShortcut($p)
    if (($l.TargetPath -like '*msedge.exe' -or $l.TargetPath -like '*chrome.exe') -and $l.Arguments -like '*riposte*') {
      $l.TargetPath = $exe; $l.Arguments = ''; $l.WorkingDirectory = (Split-Path $exe); $l.IconLocation = "$exe,0"; $l.Save()
    }
  }
}`
	cmd := exec.Command("powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps)
	cmd.Env = append(os.Environ(), "RIPOSTE_EXE="+exe)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000}
	cmd.Run()
}

func main() {
	exe, _ := os.Executable()
	go fixOldShortcuts(exe)
	dir := filepath.Dir(exe)
	external := filepath.Join(dir, "riposte.html")

	_ = external
	os.Remove(exe + ".old") // left behind by a previous self-update
	go func() {
		time.Sleep(4 * time.Second)
		for {
			checkUpdates(dir, exe)
			time.Sleep(6 * time.Hour)
		}
	}()

	serveGame := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(bestPage(dir))
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", serveGame)

	addr := "127.0.0.1:" + strconv.Itoa(port)
	if ln, err := net.Listen("tcp", addr); err == nil {
		go http.Serve(ln, mux)
	} // if the port is taken, another Riposte window is already serving it

	dataDir := filepath.Join(os.Getenv("APPDATA"), "Riposte")
	os.MkdirAll(dataDir, 0o755)
	os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--autoplay-policy=no-user-gesture-required")

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  filepath.Join(dataDir, "webview"),
		WindowOptions: webview2.WindowOptions{
			Title:  "Riposte",
			Width:  1280,
			Height: 860,
			IconId: 1,
			Center: true,
		},
	})
	if w == nil {
		alert("Riposte needs the Microsoft Edge WebView2 runtime, which comes with Windows 11.\n\nInstall it from Microsoft (search \"WebView2 Runtime\") and try again.")
		return
	}
	defer w.Destroy()
	w.SetSize(800, 540, webview2.HintMin)

	hwnd := uintptr(w.Window())
	w.Bind("rpToggleFullscreen", func() { w.Dispatch(func() { toggleFullscreen(hwnd) }) })
	w.Bind("rpQuit", func() { w.Dispatch(func() { w.Terminate() }) })
	// the story knows who's playing (it never leaves this computer)
	w.Bind("rpWho", func() string {
		if u := os.Getenv("USERNAME"); u != "" {
			return u
		}
		return os.Getenv("USER")
	})
	// once, late in the story, a note turns up next to the game. Only ever this one file, only if it isn't there yet.
	w.Bind("rpLeaveNote", func(text string) bool {
		if len(text) > 2048 {
			return false
		}
		p := filepath.Join(dir, "MLO.txt")
		if _, err := os.Stat(p); err == nil {
			return false
		}
		return os.WriteFile(p, []byte(text), 0o644) == nil
	})
	w.Init("window.RIPOSTE_APP = true;")
	w.Navigate("http://" + addr + "/")
	w.Run()
}
