
export function isValidSerial(serial) {
    const isValidUUIDv4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/gi;
    return isValidUUIDv4Regex.test(serial);
}
