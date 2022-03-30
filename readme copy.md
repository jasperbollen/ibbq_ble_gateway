# BLE_Gateway


`BLE_gateway` is a middleware tool to expose the bbq bluetooth devices by Inkbird towards the internet.
This tool is still in development.



## Features
`BLE_gateway` let's you connect to the bluetooth device and supports the following functionality
- Getting battery status updates
- Getting temperature updates per probe
- Setting temperature units (C or F)
- Set the aimed temperature for a specific probe (In progress)
- Set the maximum and minimum temperature for a specific probe (In progress)

These functionalities are to be exposed via a simple express api layer (TODO)

## Concepts
Conceptually, the api layer can be made available in 2 ways:
1. Local support only: set on port forwarding on your router to the device hosting the express server.
2. Publicly exposed: have accompanied components in place
Second solution would involve a more complete architecture as seen below.
![Build Status](https://i.ibb.co/8dd63fZ/bbq-drawio.png)




## Installation

`BLE_gateway` requires [Node.js](https://nodejs.org/) v14+ to run.


Install the dependencies and start in development mode.

```sh
npm run dev
```

For production environments

```sh
npm run build
npm run start
```


