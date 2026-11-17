package main

import (
	"os"
	"path/filepath"
	"testing"
)

const sm = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://latentworx.com/</loc></url>
<url><loc> https://latentworx.com/finder/ </loc></url></urlset>`

func TestParseSitemap(t *testing.T) {
	got, err := parseSitemap([]byte(sm))
	if err != nil || len(got) != 2 || got[1] != "https://latentworx.com/finder/" {
		t.Fatalf("got %v, %v", got, err)
	}
	if _, err := parseSitemap([]byte(`<urlset></urlset>`)); err == nil {
		t.Fatal("empty sitemap must error")
	}
	if _, err := parseSitemap([]byte(`not xml`)); err == nil {
		t.Fatal("bad xml must error")
	}
}

func TestBuildPayload(t *testing.T) {
	p, err := buildPayload("k", []string{"https://a.com/", "https://a.com/x/"})
	if err != nil || p.Host != "a.com" || len(p.URLList) != 2 {
		t.Fatalf("got %+v, %v", p, err)
	}
	if _, err := buildPayload("k", []string{"https://a.com/", "https://b.com/"}); err == nil {
		t.Fatal("mixed hosts must error")
	}
	if _, err := buildPayload("k", nil); err == nil {
		t.Fatal("no URLs must error")
	}
}

func TestFindKey(t *testing.T) {
	d := t.TempDir()
	os.WriteFile(filepath.Join(d, "other.txt"), []byte("nope"), 0o644)
	if _, err := findKey(d); err == nil {
		t.Fatal("no key file must error")
	}
	os.WriteFile(filepath.Join(d, "abc123.txt"), []byte("abc123\n"), 0o644)
	if k, err := findKey(d); err != nil || k != "abc123" {
		t.Fatalf("got %q, %v", k, err)
	}
}
