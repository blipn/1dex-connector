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
		baseURL+"/adresse/10-rue-des-cordeliers-aix-en-provence-13100/explore/map-layer/parcelles?city_code=13001&lon=5.446765371857839&lat=43.52966775616209&parcel_record_key=13001000AS0323&parcel_phase=initial&viewport_bbox=5.44628%2C43.52926%2C5.44725%2C43.53008&viewport_zoom=19.25&viewport_render_mode=features",
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
