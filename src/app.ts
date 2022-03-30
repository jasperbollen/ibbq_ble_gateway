import { BBQDevice } from "./ble_ibbq/index";
import express from "express";
import qrcode from "qrcode";

const bbqDevice = new BBQDevice("fff0");
bbqDevice.on("devicePaired", () => {
    console.log("Your bluetooth device has been paired. Scan QR code to link device to your account.");
    qrcode.toString(bbqDevice.id, { type: "terminal" }, function (err, url) {
        console.log(url);
    });
});
bbqDevice.connect();

const app = express();

app.get("/api", function (req, res) {
    res.send("API endpoint");
});

app.listen(3000);
