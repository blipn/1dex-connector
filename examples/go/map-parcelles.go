package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

func main() {
	baseURL := "https://1dex.fr"
	if configured := os.Getenv("ONEDEX_BASE_URL"); configured != "" {
		baseURL = strings.TrimRight(configured, "/")
	}

	req, err := http.NewRequest(
		"GET",
		baseURL+"/explore/map-layer/parcelles?address=50%20rue%20des%20tanneurs%20aix&viewport_render_mode=features",
		nil,
	)
	if err != nil {
		panic(err)
	}

	req.Header.Set("Accept", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		panic(err)
	}

	fmt.Println(res.Status)
	fmt.Println(string(data))
}
