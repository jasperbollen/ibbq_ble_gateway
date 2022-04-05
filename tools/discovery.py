from bluepy.btle import Peripheral, Service, Characteristic, Descriptor
import argparse
from typing import Collection, NamedTuple, List


class CMetadata(NamedTuple):
    uuid: str
    name: str
    readable: bool
    encodings: List[str]
    flags: str = ""


def try_uint(data: bytes, nbits: int = 8, endianness: str = "big") -> bool:
    """Try uint in bits"""
    number = int.from_bytes(data, endianness, signed=False)
    return 0 <= number < (2**nbits) - 1


def try_int(data: bytes, nbits: int = 8, endianness: str = "big") -> bool:
    number = int.from_bytes(data, endianness, signed=True)
    max_val = (2**nbits-1) - 1
    return -max_val <= number <= max_val


def try_int_encoding(
    data: bytes, signed: bool, nbits: int = 8, endianness: str = "big"
):
    if signed:
        return try_int(data, nbits, endianness)
    return try_uint(data, nbits, endianness)


ENCODING_NAMES = {
    "u8_big": (False, 8, "big"),
    "u8_little": (False, 8, "little"),
    "u16_big": (False, 16, "big"),
    "u16_little": (False, 16, "little"),
    "i8_big": (True, 8, "big"),
    "i8_little": (True, 8, "little"),
    "i16_big": (True, 16, "big"),
    "i16_little": (True, 16, "little"),
    "i32_big": (True, 32, "big"),
    "i32_little": (True, 32, "little")

}


def detect_encodings(data: bytes) -> List[str]:
    """Detect some encodings from data"""
    encodings = []

    try:
        data.decode("ascii")
    except:
        pass
    else:
        encodings.append("ascii")

    for encoding_name, arg in ENCODING_NAMES.items():
        signed, bits, endianness = arg
        if try_int_encoding(data, signed, bits, endianness):
            encodings.append(encoding_name)

    return encodings


def collect_characteristic_metadata(characteristic: Characteristic) -> CMetadata:
    uuid = str(characteristic.uuid)
    name = characteristic.uuid.getCommonName()
    # Bitflag 16 is NOTIFY
    readable = characteristic.supportsRead()
    # Bitflag 16 is NOTIFY
    notifiable = bool(characteristic.properties & 16)

    if not readable and not notifiable:
        encodings = []
    else:
        value = characteristic.read()
        encodings = detect_encodings(value)

    return CMetadata(uuid, name, readable, encodings, characteristic.propertiesToString())


def collect_descriptor_metadata(descriptor: Descriptor) -> CMetadata:
    uuid = str(descriptor.uuid)
    name = descriptor.uuid.getCommonName()

    # descriptors do not have a supportsread attribute, so we we have to try reading
    # them
    try:
        value = descriptor.read()
    except:
        readable = False
        encodings = []
    else:
        readable = True
        encodings = detect_encodings(value)

    return CMetadata(uuid, name, readable, encodings)


def collect_service_metadata(service: Service):
    print("====================================")
    print(
        f"Collecting metadata for service: UUID= {str(service.uuid)}, "
        f"name = {service.uuid.getCommonName()}"
    )

    print("------------------------------------")
    print("Characteristics")
    print("------------------------------------")
    print("UUID, name, is_readable, flags, possible_encodings")
    for c in service.getCharacteristics():
        cmetadata = collect_characteristic_metadata(c)
        print(
            f"{cmetadata.uuid}, {cmetadata.name}, {cmetadata.readable}, " 
            f"{cmetadata.flags}, {cmetadata.encodings}"
        )

    print("------------------------------------")
    print("Service Descriptors")
    print("------------------------------------")
    print("UUID, name, is_readable, possible_encodings")
    for d in service.getDescriptors():
        cmetadata = collect_descriptor_metadata(d)
        print(
            f"{cmetadata.uuid}, {cmetadata.name}, {cmetadata.readable}, "
            f"{cmetadata.encodings}"
        )

    print("------------------------------------")
    print("Characteristic Descriptors")
    print("------------------------------------")
    print(
        "Characteristic UUID, Descriptor UUID, name, is_readable, possible_encodings, "
        "data"
    )
    for c in service.getCharacteristics():
        for d in c.getDescriptors():
            cmetadata = collect_descriptor_metadata(d)
            if cmetadata.readable:
                data = d.read()
            else:
                data = "N/A"
            print(
                f"{c.uuid}, {cmetadata.uuid}, {cmetadata.name}, {cmetadata.readable}, "
                f"{cmetadata.encodings}, {data}"
            )
    print("====================================")


def collect_metadata(services: Collection[Service]):
    for service in services:
        collect_service_metadata(service)
        print("\n\n\n\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mac_address", help="MAC Address of BLE device")

    args = parser.parse_args()

    peripheral = Peripheral(args.mac_address)

    collect_metadata(peripheral.getServices())
    peripheral.disconnect()
