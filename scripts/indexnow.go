// indexnow submits every URL in a sitemap to IndexNow (Beck tracker 73).
//
//	go run scripts/indexnow.go -sitemap https://latentworx.com/sitemap.xml
//	go run scripts/indexnow.go -sitemap public/sitemap.xml -dry-run
//
// The key is the single static/*.txt whose file name equals its content. Before
// submitting, the script waits until https://<host>/<key>.txt serves the key.
// Exit is non-zero unless IndexNow answers 200 or 202. Stdlib only.
package main

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const endpoint = "https://api.indexnow.org/indexnow"

type urlset struct {
	URLs []struct {
		Loc string `xml:"loc"`
	} `xml:"url"`
}

// parseSitemap returns the <loc> of every <url> entry, trimmed, in order.
func parseSitemap(data []byte) ([]string, error) {
	var u urlset
	if err := xml.Unmarshal(data, &u); err != nil {
		return nil, fmt.Errorf("parse sitemap: %w", err)
	}
	var out []string
	for _, e := range u.URLs {
		if l := strings.TrimSpace(e.Loc); l != "" {
			out = append(out, l)
		}
	}
	if len(out) == 0 {
		return nil, errors.New("sitemap lists no URLs")
	}
	return out, nil
}

type payload struct {
	Host    string   `json:"host"`
	Key     string   `json:"key"`
	URLList []string `json:"urlList"`
}

// buildPayload checks every URL is on one host and returns the request body.
func buildPayload(key string, urls []string) (payload, error) {
	var host string
	for _, s := range urls {
		u, err := url.Parse(s)
		if err != nil || u.Host == "" {
			return payload{}, fmt.Errorf("bad URL %q", s)
		}
		if host == "" {
			host = u.Host
		} else if u.Host != host {
			return payload{}, fmt.Errorf("URL %q is not on host %s", s, host)
		}
	}
	if host == "" {
		return payload{}, errors.New("no URLs")
	}
	return payload{Host: host, Key: key, URLList: urls}, nil
}

// findKey returns the name of the one *.txt in dir whose content equals its name.
func findKey(dir string) (string, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.txt"))
	if err != nil {
		return "", err
	}
	var keys []string
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			continue
		}
		name := strings.TrimSuffix(filepath.Base(f), ".txt")
		if strings.TrimSpace(string(b)) == name {
			keys = append(keys, name)
		}
	}
	if len(keys) != 1 {
		return "", fmt.Errorf("want exactly one key file in %s, found %d", dir, len(keys))
	}
	return keys[0], nil
}

func fetch(c *http.Client, loc string) ([]byte, error) {
	resp, err := c.Get(loc)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: HTTP %d", loc, resp.StatusCode)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 10<<20))
}

func readSitemap(c *http.Client, src string) ([]byte, error) {
	if strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://") {
		return fetch(c, src)
	}
	return os.ReadFile(src)
}

// waitForKey polls the live key file until it serves the key or tries run out.
func waitForKey(c *http.Client, host, key string, tries int, pause time.Duration) error {
	loc := "https://" + host + "/" + key + ".txt"
	var last error
	for i := 0; i < tries; i++ {
		b, err := fetch(c, loc)
		if err == nil && strings.TrimSpace(string(b)) == key {
			return nil
		}
		if err == nil {
			err = errors.New("key file content differs")
		}
		last = err
		time.Sleep(pause)
	}
	return fmt.Errorf("live key file not ready: %w", last)
}

func main() {
	sitemap := flag.String("sitemap", "", "sitemap URL or path (required)")
	staticDir := flag.String("static", "static", "directory holding the key file")
	dry := flag.Bool("dry-run", false, "print the JSON body and send nothing")
	flag.Parse()
	if *sitemap == "" {
		fmt.Fprintln(os.Stderr, "-sitemap is required")
		os.Exit(2)
	}
	c := &http.Client{Timeout: 30 * time.Second}
	if err := run(c, *sitemap, *staticDir, *dry); err != nil {
		fmt.Fprintln(os.Stderr, "indexnow:", err)
		os.Exit(1)
	}
}

func run(c *http.Client, sitemap, staticDir string, dry bool) error {
	key, err := findKey(staticDir)
	if err != nil {
		return err
	}
	data, err := readSitemap(c, sitemap)
	if err != nil {
		return err
	}
	urls, err := parseSitemap(data)
	if err != nil {
		return err
	}
	p, err := buildPayload(key, urls)
	if err != nil {
		return err
	}
	body, err := json.Marshal(p)
	if err != nil {
		return err
	}
	if dry {
		fmt.Println(string(body))
		return nil
	}
	if err := waitForKey(c, p.Host, key, 30, 10*time.Second); err != nil {
		return err
	}
	resp, err := c.Post(endpoint, "application/json; charset=utf-8", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	fmt.Printf("HTTP %d (%d URLs)\n", resp.StatusCode, len(urls))
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("IndexNow answered HTTP %d", resp.StatusCode)
	}
	return nil
}
