const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create ssl directory if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
}

// Generate self-signed certificate using Node.js crypto
const forge = require('node-forge');

console.log('Generating SSL certificates...');

// Generate a keypair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
    name: 'commonName',
    value: 'localhost'
}, {
    name: 'countryName',
    value: 'US'
}, {
    shortName: 'ST',
    value: 'State'
}, {
    name: 'localityName',
    value: 'City'
}, {
    name: 'organizationName',
    value: 'Live Captions'
}, {
    shortName: 'OU',
    value: 'Live Captions'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Add Subject Alternative Names for various IPs and hostnames
cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
}, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
}, {
    name: 'extKeyUsage',
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
}, {
    name: 'nsCertType',
    server: true,
    client: true,
    email: true,
    objsign: true,
    sslCA: true,
    emailCA: true,
    objCA: true
}, {
    name: 'subjectAltName',
    altNames: [{
        type: 2, // DNS
        value: 'localhost'
    }, {
        type: 7, // IP
        ip: '127.0.0.1'
    }, {
        type: 7, // IP
        ip: '::1'
    }]
}]);

// Self-sign certificate
cert.sign(keys.privateKey);

// Convert to PEM format
const certPem = forge.pki.certificateToPem(cert);
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);

// Write files
fs.writeFileSync(path.join(sslDir, 'cert.pem'), certPem);
fs.writeFileSync(path.join(sslDir, 'key.pem'), keyPem);

console.log('SSL certificates generated successfully!');
console.log('Files created:');
console.log('  - ssl/cert.pem');
console.log('  - ssl/key.pem');
