# 🤖 PrimeBot

Bot multifunción para WhatsApp con vinculación por código de 8 dígitos.

## 📲 Instalación en Termux

1 - Actualiza e instala los paquetes necesarios:

    pkg update && pkg upgrade -y && pkg install git nodejs ffmpeg libwebp imagemagick python -y && pip install yt-dlp


2 - Clona el repositorio:

    git clone https://github.com/mundoheitzacmundoheitzac-spec/PrimeBot.git

3 - Entra a la carpeta del bot:

    cd PrimeBot

4 - Instala las dependencias:

    npm install

5 - Activa la vinculación por código de 8 dígitos:

    node --input-type=commonjs -e 'const fs = require("fs"); let code = fs.readFileSync("index.js", "utf8"); const pairing = `\n if (!sock.authState.creds.registered) {\n const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });\n rl.question("\\n📱 Escribe tu numero con 521 (ej. 521639178980): ", async (num) => {\n const c = await sock.requestPairingCode(num.trim());\n console.log("\\n🔑 TU CODIGO DE VINCULACION:", c);\n rl.close();\n });\n }\n`; code = code.replace("sock.ev.on(\x27creds.update\x27, saveCreds);", "sock.ev.on(\x27creds.update\x27, saveCreds);" + pairing); fs.writeFileSync("index.js", code); console.log("✅ Listo");'

6 - Ejecuta el bot:

    node index.js

7 - Vincula tu cuenta: escribe tu número con código de país (por ejemplo `521639178980`), presiona **Enter** e ingresa el código de 8 dígitos en WhatsApp (**Dispositivos vinculados**).

## 🔄 Encender y apagar el bot

8 - Volver a prender el bot (si cerraste Termux):

    cd PrimeBot && node index.js

9 - Apagar el bot (presiona estas teclas en Termux):

    CTRL + C
