# Overview

Create for me an app that shows me the arrival times of the next Boston MBTA subway train for a selected subway line.

The user will be shown a map of the Boston area and a drop down box showing the names of the subway lines (e.g. Green, Red, etc.). The map will take up most of the screen.

When the user selects a line:
* the line will be drawn on the map, using the name of the line as the color
* the station names will be shown in a large type font
* the predicted arrival time of the next train will be shown.

# External services to use

Use the MBTA API portal with the MBTA_API_KEY from the .env file. Use the MBTA documentation to understand how to use the key: https://www.mbta.com/developers/v3-api

# Requirements

Use Python for the backend, server part of the app (FastAPI). Use JavaScript for the front end. 