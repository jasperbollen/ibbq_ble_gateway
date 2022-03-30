import { BBQDevice } from './ble_ibbq/index'
import express from 'express'

const bbqDevice = new BBQDevice('fff0')
bbqDevice.connect()


const app = express()


app.get('/api', function (req, res) {
    res.send('API endpoint')
})

app.listen(3000)
