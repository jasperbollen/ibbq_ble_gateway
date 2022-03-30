import deviceConfig from './config.json'
import noble from '@abandonware/noble'
import { pairingKey, subscribeTemperatureUpdates, subscribeBatteryUpdartes, setCelciusUnits, setFahrenheitUnits } from './buffer'
import { iProbe } from './interfaces'
import EventEmitter from 'events'

class BBQDevice extends EventEmitter{
	id: string
    currentTemperature: number
    temperatureUnit: string
    probes: iProbe[]
    batteryLevel: number
    serviceUUID: string
    private characteristics: {
        pairCharacteristic?: any
        tempCharacteristic?: any
        commandCharacteristic?: any
        batteryCharacterisitc?: any
    }
    private bluetoothState: string
	connected: boolean

    constructor(serviceUUID: string) {
		super()
        this.serviceUUID = serviceUUID
        this.temperatureUnit = deviceConfig.temperatureUnit
        this.characteristics = {}
        this.probes = []
        //Setting probes
        deviceConfig.probes.forEach((probe) => {
            this.probes.push(probe)
        })
    }

    public connect() {
        this.startScanning()
        try {
            noble.on('discover', async (peripheral: any) => {
                if (peripheral.advertisement.localName === 'iBBQ') {
                    peripheral.on('disconnect', () => {
                        console.log('Lost connection to device.')
                        noble.stopScanning()
                        this.startScanning()
                    })
                }
                peripheral.connect((error) => {
                    if (error) {
                        console.error(error)
                        return null
                    }
                    console.log('Bluetooth device found')
					this.id = peripheral.id
                    noble.stopScanning()
                    this.populateCharacteristics(peripheral)
                })
            })
        } catch (e) {
            console.log(e)
        }
    }

    private startScanning() {
        try {
			this.connected = false
            noble.on('stateChange', async (state) => {
                if (state === 'poweredOn') {
                    this.bluetoothState = state
                    console.log(`Starting bluetooth scan for UUID: ${this.serviceUUID}`)
                    noble.startScanning([this.serviceUUID], false)
                }
            })
            if (this.bluetoothState === 'poweredOn') {
                console.log(`Staring bluetooth scan for UUID: ${this.serviceUUID}`)
                noble.startScanning([this.serviceUUID], false)
            }
        } catch (e) {
            console.log(e)
        }
    }

    private populateCharacteristics(peripheral) {
        try {
            peripheral.discoverAllServicesAndCharacteristics((error, services, characteristics) => {
                if (error) {
                    console.error('error')
                    return null
                }
                this.characteristics.batteryCharacterisitc = characteristics.filter((obj) => {
                    return obj.uuid === 'fff1'
                })
                this.characteristics.pairCharacteristic = characteristics.filter((obj) => {
                    return obj.uuid === 'fff2'
                })
                this.characteristics.tempCharacteristic = characteristics.filter((obj) => {
                    return obj.uuid === 'fff4'
                })
                this.characteristics.commandCharacteristic = characteristics.filter((obj) => {
                    return obj.uuid === 'fff5'
                })
                this.login()
            })
        } catch (e) {
            console.log(e)
        }
    }

    private login() {
        try {
            this.characteristics.pairCharacteristic[0].write(pairingKey(), false, (error) => {
                console.log('Pairing')
                if (error) {
                    console.error(error)
                    return null
                }
				this.connected = true
				this.emit('devicePaired')
                this.SubscribeToTemperatureData()
                this.setDeviceUnits(this.temperatureUnit)
                this.requestBatteryStatus()
            })
        } catch (e) {
            console.log(e)
        }
    }

    private SubscribeToTemperatureData() {
        try {
            this.characteristics.tempCharacteristic[0].subscribe((error) => {
                if (error) {
                    console.error('Error subscribing ')
                } else {
                    console.log('Subscribed for temperature notifications')
                }
            })

            this.characteristics.tempCharacteristic[0].on('data', (data) => {
                this.handleTemperatureData(data)
            })

            this.characteristics.commandCharacteristic[0].write(subscribeTemperatureUpdates(), false)
        } catch (e) {
            console.log(e)
        }
    }

    private handleTemperatureData(data: Buffer) {
        console.log('Received temperature data from device')
        this.probes.forEach((probe) => {
            const dataOffset = (probe.position - 1) * 2 //2 bytes are used for temperature per probe
            probe.currentTemperature = data.readInt16LE(dataOffset) / 10
        })
    }

    private requestBatteryStatus() {
        this.characteristics.batteryCharacterisitc[0].subscribe((error) => {
            if (error) {
                console.error('Error subscribing ')
            } else {
                console.log('Subscribed for battery notifications')
            }
        })

        this.characteristics.batteryCharacterisitc[0].on('data', (data) => {
            this.handleBatteryData(data)
        })

        setInterval(() => {
            this.characteristics.commandCharacteristic[0].write(subscribeBatteryUpdartes(), false)
        }, 5000)
    }

    private handleBatteryData(data: Buffer) {
        console.log('Received battery data from device')
        const current = data.readUInt16LE(1)
        const max = data.readUInt16LE(3)

        this.batteryLevel = (current / max) * 100
    }

    public setDeviceUnits(unit:string) {
		this.temperatureUnit = unit
        let temperaturebuffer: Buffer
        switch (this.temperatureUnit) {
            case 'C':
                temperaturebuffer = setCelciusUnits()
                break
            case 'F':
                temperaturebuffer = setFahrenheitUnits()
                break
        }
        console.log(`Setting device temperature units to ${this.temperatureUnit}`)
        this.characteristics.commandCharacteristic[0].write(temperaturebuffer, false, (error) => {
            if (error) {
                console.log(error)
            }
        })
    }
}

export { BBQDevice }
