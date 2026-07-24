package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// ThemeVar represents a CSS variable for a color
type ThemeVar struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

var hexColorRegex = regexp.MustCompile(`^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`)
var cssVarRegex = regexp.MustCompile(`^\s*(--[a-zA-Z0-9-]+)\s*:\s*(#[a-zA-Z0-9]+)\s*;`)

func getCSSPaths() []string {
	paths := []string{
		"assets/css/design-system.css",
		"../assets/css/design-system.css",
		"design-system.css",
		"../design-system.css",
	}
	var found []string
	// Use a map to prevent duplicates since multiple relative paths might point to the same absolute path
	seen := make(map[string]bool)
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			abs, _ := filepath.Abs(p)
			if !seen[abs] {
				found = append(found, abs)
				seen[abs] = true
			}
		}
	}
	return found
}

func handleGetTheme(w http.ResponseWriter, r *http.Request) {
	paths := getCSSPaths()
	if len(paths) == 0 {
		http.Error(w, "Could not find design-system.css", http.StatusInternalServerError)
		return
	}
	// Just read the first one
	cssPath := paths[0]
	file, err := os.Open(cssPath)
	if err != nil {
		http.Error(w, "Could not open css file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	var vars []ThemeVar
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		matches := cssVarRegex.FindStringSubmatch(line)
		if len(matches) == 3 {
			vars = append(vars, ThemeVar{
				Name:  matches[1],
				Value: matches[2],
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vars)
}

func handleUpdateTheme(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req map[string]string
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	paths := getCSSPaths()
	if len(paths) == 0 {
		http.Error(w, "Could not find design-system.css", http.StatusInternalServerError)
		return
	}

	for _, cssPath := range paths {
		content, err := os.ReadFile(cssPath)
		if err != nil {
			http.Error(w, "Could not read css file: "+err.Error(), http.StatusInternalServerError)
			return
		}

		lines := strings.Split(string(content), "\n")
		for i, line := range lines {
			matches := cssVarRegex.FindStringSubmatch(line)
			if len(matches) == 3 {
				varName := matches[1]
				if newValue, exists := req[varName]; exists {
					if hexColorRegex.MatchString(newValue) {
						// Replace just the color part, preserving indentation and comments
						newLine := strings.Replace(line, matches[2], newValue, 1)
						lines[i] = newLine
					}
				}
			}
		}

		newContent := strings.Join(lines, "\n")
		err = os.WriteFile(cssPath, []byte(newContent), 0644)
		if err != nil {
			http.Error(w, "Could not save css file: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"success"}`))
}

func handleIndex(w http.ResponseWriter, r *http.Request) {
	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Theme Editor</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #1a1a1a; color: #fff; padding: 2rem; max-width: 800px; margin: 0 auto; }
        h1 { border-bottom: 1px solid #333; padding-bottom: 1rem; }
        .var-group { margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; background: #2a2a2a; padding: 1rem; border-radius: 8px; }
        .var-name { font-family: monospace; color: #a1a1aa; }
        input[type="color"] { cursor: pointer; border: none; background: none; width: 40px; height: 40px; padding: 0; }
        .reset-btn { background: none; border: 1px solid #444; color: #a1a1aa; cursor: pointer; border-radius: 4px; padding: 4px 8px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; transition: all 0.2s; }
        .reset-btn:hover { background: #444; color: #fff; }
        .controls { display: flex; gap: 1rem; align-items: center; }
    </style>
</head>
<body>
    <h1>Theme Editor</h1>
    <p>Update your primitive color variables. Changes save and update live. Click the ↺ button to revert to the initial color.</p>
    <form id="themeForm">
        <div id="variables">Loading...</div>
    </form>

    <script>
        document.addEventListener("DOMContentLoaded", async () => {
            const res = await fetch("/api/theme");
            const vars = await res.json();
            const container = document.getElementById("variables");
            container.innerHTML = "";
            vars.forEach(v => {
                const div = document.createElement("div");
                div.className = "var-group";
                // Only allow editing 6-digit hex colors for HTML color picker compatibility
                const hexValue = v.value.length === 9 ? v.value.substring(0, 7) : v.value;
                div.innerHTML = ` + "`" + `
                    <span class="var-name">${v.name}</span>
                    <div class="controls">
                        <input type="color" name="${v.name}" value="${hexValue}" data-initial="${hexValue}">
                        <button type="button" class="reset-btn" data-target="${v.name}" title="Reset to initial color">↺</button>
                    </div>
                ` + "`" + `;
                container.appendChild(div);
            });
        });

        let debounceTimer;
        const form = document.getElementById("themeForm");

        async function saveTheme() {
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => data[key] = value);
            
            await fetch("/api/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
        }

        document.getElementById("variables").addEventListener("input", (e) => {
            if (e.target.type === "color") {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    saveTheme();
                }, 50);
            }
        });

        document.getElementById("variables").addEventListener("click", (e) => {
            if (e.target.classList.contains("reset-btn")) {
                const targetName = e.target.getAttribute("data-target");
                const input = document.querySelector(` + "`" + `input[name="${targetName}"]` + "`" + `);
                if (input) {
                    input.value = input.getAttribute("data-initial");
                    saveTheme();
                }
            }
        });
    </script>
</body>
</html>`
	w.Header().Set("Content-Type", "text/html")
	io.Copy(w, bytes.NewBufferString(html))
}

func main() {
	http.HandleFunc("/", handleIndex)
	http.HandleFunc("/api/theme", handleGetTheme)
	http.HandleFunc("/api/update", handleUpdateTheme)

	port := "8181"
	fmt.Printf("Theme Editor UI running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
