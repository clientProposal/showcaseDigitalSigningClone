# To run code

npm run dev
You must create a certificate to attempt the digital signature and save it under public/

-This is not a REAL recommended approach to certificate storage!!
-This is for demonstration purposes only. The most important thing is that the certificate is accessible, speak to a digital certificate provider about how to store your digital certificate.

## Create certificates on Mac:
openssl req -x509 -newkey rsa:2048 -nodes -days 365 -keyout sign.key -out sign.crt

openssl pkcs12 -export -out sign.pfx -inkey sign.key -in sign.crt

## Digital Signatures:
The most important part is really at src/applyApproval.js
