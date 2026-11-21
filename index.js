import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import { exec } from 'child_process';
import fs from 'fs';
import readline from 'readline';

let config = { prefijo: '/', encendido: true, grupos: {} };

const MENU_IMG_DEFAULT = 'https://imgur.com';

const GIFS_ACCIONES = {
    abrazar: { texto: 'abrazó a', url: 'https://tenor.com' },
    besar: { texto: 'besó a', url: 'https://tenor.com' },
    bofetada: { texto: 'abofeteó a', url: 'https://tenor.com' },
    cenar: { texto: 'cenó con', url: 'https://tenor.com' },
    golpear: { texto: 'golpeó a', url: 'https://tenor.com' },
    luchar: { texto: 'luchó contra', url: 'https://tenor.com' },
    matar: { texto: 'eliminó a', url: 'https://tenor.com' }
};

function getGrupo(id) {
    if (!config.grupos[id]) config.grupos[id] = { antilink: false, antisticker: false, welcome: false, onlyadmin: false, warns: {} };
    return config.grupos[id];
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_bot');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('\n📱 Escribe tu número con código de país sin + (ej. 521639178980): ', async (num) => {
            try {
                const c = await sock.requestPairingCode(num.trim());
                console.log('\n🔑 TU CÓDIGO DE VINCULACIÓN:', c, '\n');
            } catch (e) {
                console.log('❌ Error al pedir código:', e.message);
            }
            rl.close();
        });
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'close') iniciarBot();
        else if (u.connection === 'open') console.log('🤖 ¡PrimeBot Conectado!');
    });

    sock.ev.on('group-participants.update', async (anu) => {
        const g = getGrupo(anu.id);
        if (!g.welcome) return;
        for (let num of anu.participants) {
            if (anu.action === 'add') await sock.sendMessage(anu.id, { text: `👋 ¡Bienvenido @${num.split('@').at(0)}!`, mentions: [num] });
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages.at(0);
        if (!msg || !msg.message) return;
        const chat = msg.key.remoteJid;
        const esGrupo = chat.endsWith('@g.us');
        const remitente = esGrupo ? msg.key.participant : chat;
        const botJid = sock.user?.id?.split(':') + '@s.whatsapp.net';
        const esDueno = remitente === botJid || msg.key.fromMe;
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';

        let esAdmin = false, metadata = null;
        if (esGrupo) {
            metadata = await sock.groupMetadata(chat);
            const admins = metadata.participants.filter(p => p.admin !== null).map(p => p.id);
            esAdmin = admins.includes(remitente) || esDueno;
            const g = getGrupo(chat);
            if (g.antilink && !esAdmin && (texto.includes('://://whatsapp.com') || texto.includes('http'))) {
                await sock.sendMessage(chat, { delete: msg.key });
                return sock.sendMessage(chat, { text: `🚫 @${remitente.split('@').at(0)}, enlaces prohibidos.`, mentions: [remitente] });
            }
            if (g.antisticker && !esAdmin && msg.message.stickerMessage) return sock.sendMessage(chat, { delete: msg.key });
        }

        if (!texto.startsWith(config.prefijo)) return;
        const args = texto.slice(config.prefijo.length).trim().split(/ +/);
        const comando = args.shift().toLowerCase();
        if (!config.encendido && !esDueno) return;
        if (esGrupo && getGrupo(chat).onlyadmin && !esAdmin) return;
        const p = config.prefijo;

        if (comando === 'menu') {
            const ahora = new Date();
            const fecha = ahora.toLocaleDateString('es-MX', { timeZone: 'America/Chihuahua' });
            const hora = ahora.toLocaleTimeString('es-MX', { timeZone: 'America/Chihuahua' });
            const menuTexto = `🤖\n╭───≽ ¡BIENVENIDO! ≼───\n│ • *PrimeBot*\n│ • Fecha: ${fecha}\n│ • Hora: ${hora}\n│ • Prefijo: ${p}\n│ • Versión: 1.0.0\n╰────「 🪐 」────\n\n╭───≽ DUEÑO ≼───\n│ • ${p}exec | ${p}get-group-id\n│ • ${p}off | ${p}on | ${p}set-prefix\n│ • ${p}set-menu-image\n╰────「 🖼️ 」────\n\n╭───≽ ADMINS ≼───\n│ • ${p}anti-link (1/0)\n│ • ${p}anti-sticker (1/0)\n│ • ${p}only-admin (1/0)\n│ • ${p}welcome (1/0)\n│ • ${p}ban | ${p}promote | ${p}demote\n│ • ${p}open | ${p}close | ${p}link-group\n│ • ${p}hidetag | ${p}set-name | ${p}delete\n│ • ${p}warn | ${p}unwarn\n╰────「 ⭐ 」────\n\n╭───≽ PRINCIPAL ≼───\n│ • ${p}ping | ${p}profile\n│ • ${p}sticker | ${p}to-image | ${p}to-mp3\n│ • ${p}yt-search\n╰────「 🚀 」────\n\n╭───≽ DESCARGAS ≼───\n│ • ${p}instagram | ${p}facebook\n│ • ${p}tik-tok | ${p}x-twitter\n│ • ${p}play | ${p}play-audio | ${p}play-video\n│ • ${p}yt-mp3 | ${p}yt-mp4\n╰────「 🎶 」────\n\n╭───≽ DIVERSIÓN ≼───\n│ • ${p}abrazar | ${p}besar | ${p}bofetada\n│ • ${p}cenar | ${p}dado | ${p}golpear\n│ • ${p}luchar | ${p}matar\n╰────「 🎡 」────\n\n╭───≽ EDICIÓN ≼───\n│ • ${p}blur | ${p}contraste | ${p}gray\n│ • ${p}invert | ${p}mirror | ${p}pixel\n╰────「 ✨ 」────`;
            const imagenMenu = fs.existsSync('./menu.jpg') ? fs.readFileSync('./menu.jpg') : { url: MENU_IMG_DEFAULT };
            try {
                await sock.sendMessage(chat, { image: imagenMenu, caption: menuTexto }, { quoted: msg });
            } catch {
                await sock.sendMessage(chat, { text: menuTexto }, { quoted: msg });
            }
        }
        if (comando === 'off' && esDueno) { config.encendido = false; await sock.sendMessage(chat, { text: '💤 Bot apagado.' }); }
        if (comando === 'on' && esDueno) { config.encendido = true; await sock.sendMessage(chat, { text: '⚡ Bot encendido.' }); }
        if (comando === 'set-prefix' && esDueno && args.at(0)) { config.prefijo = args.at(0); await sock.sendMessage(chat, { text: `✅ Nuevo prefijo: ${config.prefijo}` }); }
        if (comando === 'get-group-id' && esDueno) await sock.sendMessage(chat, { text: `🆔 ${chat}` });
        if (comando === 'set-menu-image' && esDueno) {
            const citandoImg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            const esImg = msg.message.imageMessage;
            if (!citandoImg && !esImg) return sock.sendMessage(chat, { text: '🖼️ Envía una foto o responde a una con /set-menu-image' });
            const mediaMsg = citandoImg ? { message: msg.message.extendedTextMessage.contextInfo.quotedMessage } : msg;
            fs.writeFileSync('./menu.jpg', await downloadMediaMessage(mediaMsg, 'buffer', {}));
            await sock.sendMessage(chat, { text: '✅ Imagen del menú actualizada.' });
        }
        if (comando === 'exec' && esDueno && args.length) exec(args.join(' '), (e, out, err) => sock.sendMessage(chat, { text: out || err || 'OK' }));

        const adminCmds = ['anti-link', 'anti-sticker', 'only-admin', 'welcome', 'ban', 'promote', 'demote', 'open', 'close', 'hidetag', 'link-group', 'set-name', 'delete', 'warn', 'unwarn'];
        if (adminCmds.includes(comando)) {
            if (!esGrupo || !esAdmin) return sock.sendMessage(chat, { text: '🚫 Solo admins en grupos.' });
            const g = getGrupo(chat);
            const mencionado = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.at(0) || msg.message.extendedTextMessage?.contextInfo?.participant;

            if (comando === 'anti-link') { g.antilink = args.at(0) === '1'; await sock.sendMessage(chat, { text: `🛡️ Anti-Link: ${g.antilink ? 'ON' : 'OFF'}` }); }
            if (comando === 'anti-sticker') { g.antisticker = args.at(0) === '1'; await sock.sendMessage(chat, { text: `🛡️ Anti-Sticker: ${g.antisticker ? 'ON' : 'OFF'}` }); }
            if (comando === 'only-admin') { g.onlyadmin = args.at(0) === '1'; await sock.sendMessage(chat, { text: `🛡️ Solo Admins: ${g.onlyadmin ? 'ON' : 'OFF'}` }); }
            if (comando === 'welcome') { g.welcome = args.at(0) === '1'; await sock.sendMessage(chat, { text: `👋 Welcome: ${g.welcome ? 'ON' : 'OFF'}` }); }
            if (comando === 'open') { await sock.groupSettingUpdate(chat, 'not_announcement'); await sock.sendMessage(chat, { text: '🔓 Grupo abierto.' }); }
            if (comando === 'close') { await sock.groupSettingUpdate(chat, 'announcement'); await sock.sendMessage(chat, { text: '🔒 Grupo cerrado.' }); }
            if (comando === 'link-group') { const c = await sock.groupInviteCode(chat); await sock.sendMessage(chat, { text: `🔗 https://://whatsapp.com/${c}` }); }
            if (comando === 'set-name' && args.length) { await sock.groupUpdateSubject(chat, args.join(' ')); await sock.sendMessage(chat, { text: '✏️ Nombre cambiado.' }); }
            if (comando === 'hidetag') { await sock.sendMessage(chat, { text: args.join(' ') || '📢 Atención', mentions: metadata.participants.map(m => m.id) }); }
            if (comando === 'delete') {
                const q = msg.message.extendedTextMessage?.contextInfo;
                if (q) await sock.sendMessage(chat, { delete: { remoteJid: chat, fromMe: false, id: q.stanzaId, participant: q.participant } });
            }
            if (comando === 'ban' && mencionado) { await sock.groupParticipantsUpdate(chat, [mencionado], 'remove'); await sock.sendMessage(chat, { text: '👢 Expulsado.' }); }
            if (comando === 'promote' && mencionado) { await sock.groupParticipantsUpdate(chat, [mencionado], 'promote'); await sock.sendMessage(chat, { text: '👑 Ahora es admin.' }); }
            if (comando === 'demote' && mencionado) { await sock.groupParticipantsUpdate(chat, [mencionado], 'demote'); await sock.sendMessage(chat, { text: '📉 Admin removido.' }); }
            if (comando === 'warn' && mencionado) {
                g.warns[mencionado] = (g.warns[mencionado] || 0) + 1;
                if (g.warns[mencionado] >= 3) { g.warns[mencionado] = 0; await sock.groupParticipantsUpdate(chat, [mencionado], 'remove'); await sock.sendMessage(chat, { text: '⛔ Expulsado por 3 warns.' }); }
                else await sock.sendMessage(chat, { text: `⚠️ Warn ${g.warns[mencionado]}/3 para @${mencionado.split('@').at(0)}`, mentions: [mencionado] });
            }
            if (comando === 'unwarn' && mencionado) { g.warns[mencionado] = 0; await sock.sendMessage(chat, { text: '✅ Warns limpios.' }); }
        }
        if (comando === 'ping') await sock.sendMessage(chat, { text: '🏓 *¡Pong!* PrimeBot Activo.' }, { quoted: msg });
        if (comando === 'profile') {
            const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.at(0) || remitente;
            let pp = null; try { pp = await sock.profilePictureUrl(target, 'image'); } catch {}
            if (pp) await sock.sendMessage(chat, { image: { url: pp }, caption: `👤 @${target.split('@').at(0)}`, mentions: [target] });
            else await sock.sendMessage(chat, { text: `👤 @${target.split('@').at(0)}`, mentions: [target] });
        }
        if (comando === 'sticker' || comando === 's') {
            const cImg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            if (!cImg && !msg.message.imageMessage) return sock.sendMessage(chat, { text: '🖼️ Envía o responde a una foto.' });
            const buf = await downloadMediaMessage(cImg ? { message: msg.message.extendedTextMessage.contextInfo.quotedMessage } : msg, 'buffer', {});
            const inF = `./s_${Date.now()}.jpg`, outF = `./s_${Date.now()}.webp`;
            fs.writeFileSync(inF, buf);
            exec(`cwebp -q 80 -resize 512 512 "${inF}" -o "${outF}"`, async () => {
                if (fs.existsSync(outF)) { await sock.sendMessage(chat, { sticker: fs.readFileSync(outF) }, { quoted: msg }); fs.unlinkSync(outF); }
                else await sock.sendMessage(chat, { text: '❌ Falta instalar libwebp en Termux.' });
                if (fs.existsSync(inF)) fs.unlinkSync(inF);
            });
        }
        if (comando === 'to-image') {
            const cSt = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
            if (!cSt) return sock.sendMessage(chat, { text: '⚠️ Responde a un sticker.' });
            const buf = await downloadMediaMessage({ message: msg.message.extendedTextMessage.contextInfo.quotedMessage }, 'buffer', {});
            const inF = `./st_${Date.now()}.webp`, outF = `./st_${Date.now()}.png`;
            fs.writeFileSync(inF, buf);
            exec(`dwebp "${inF}" -o "${outF}"`, async () => {
                if (fs.existsSync(outF)) { await sock.sendMessage(chat, { image: fs.readFileSync(outF) }, { quoted: msg }); fs.unlinkSync(outF); }
                if (fs.existsSync(inF)) fs.unlinkSync(inF);
            });
        }
        if (comando === 'to-mp3') {
            const cVid = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;
            if (!cVid) return sock.sendMessage(chat, { text: '⚠️ Responde a un video.' });
            const buf = await downloadMediaMessage({ message: msg.message.extendedTextMessage.contextInfo.quotedMessage }, 'buffer', {});
            const inF = `./v_${Date.now()}.mp4`, outF = `./a_${Date.now()}.mp3`;
            fs.writeFileSync(inF, buf);
            exec(`ffmpeg -i "${inF}" -vn -acodec libmp3lame "${outF}"`, async () => {
                if (fs.existsSync(outF)) { await sock.sendMessage(chat, { audio: fs.readFileSync(outF), mimetype: 'audio/mp4' }, { quoted: msg }); fs.unlinkSync(outF); }
                if (fs.existsSync(inF)) fs.unlinkSync(inF);
            });
        }
        if (comando === 'yt-search' && args.length) {
            exec(`yt-dlp --get-title --get-id "ytsearch5:${args.join(' ')}"`, (e, out) => {
                if (!out) return sock.sendMessage(chat, { text: '❌ No se encontraron resultados o falta yt-dlp.' });
                const l = out.trim().split('\n'); let r = '🔎 *YOUTUBE:*\n\n';
                for (let i = 0; i < l.length; i += 2) r += `🎬 *${l[i]}*\n🔗 https://youtu.be{l[i+1]}\n\n`;
                sock.sendMessage(chat, { text: r }, { quoted: msg });
            });
        }
        if (['play', 'play-audio', 'yt-mp3'].includes(comando) && args.length) {
            await sock.sendMessage(chat, { text: '⏳ Buscando y descargando música...' }, { quoted: msg });
            const outF = `./aud_${Date.now()}.mp3`, q = args.join(' ');
            exec(`yt-dlp -f "bestaudio" --extract-audio --audio-format mp3 --audio-quality 128K "${q.startsWith('http') ? q : 'ytsearch1:' + q}" -o "${outF}"`, async () => {
                if (fs.existsSync(outF)) {
                    await sock.sendMessage(chat, { audio: fs.readFileSync(outF), mimetype: 'audio/mpeg' }, { quoted: msg });
                    fs.unlinkSync(outF);
                } else {
                    await sock.sendMessage(chat, { text: '❌ No se pudo descargar. Verifica tener instalado yt-dlp y ffmpeg.' });
                }
            });
        }
        if (['play-video', 'yt-mp4', 'tik-tok', 'instagram', 'facebook', 'x-twitter'].includes(comando) && args.length) {
            await sock.sendMessage(chat, { text: '⏳ Descargando video...' }, { quoted: msg });
            const outF = `./vid_${Date.now()}.mp4`, q = args.join(' ');
            exec(`yt-dlp -f "best[ext=mp4][filesize<50M]/best[ext=mp4]" "${q.startsWith('http') ? q : 'ytsearch1:' + q}" -o "${outF}"`, async () => {
                if (fs.existsSync(outF)) { await sock.sendMessage(chat, { video: fs.readFileSync(outF) }, { quoted: msg }); fs.unlinkSync(outF); }
                else await sock.sendMessage(chat, { text: '❌ Error al descargar video.' });
            });
        }
        if (comando === 'dado') await sock.sendMessage(chat, { text: `🎲 Salió: *${Math.floor(Math.random() * 6) + 1}*` }, { quoted: msg });
        if (GIFS_ACCIONES[comando]) {
            const t = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.at(0) || msg.message.extendedTextMessage?.contextInfo?.participant;
            if (!t) return sock.sendMessage(chat, { text: `⚠️ Etiqueta a alguien para usar ${p}${comando}` });
            const info = GIFS_ACCIONES[comando];
            const caption = `✨ @${remitente.split('@').at(0)} ${info.texto} @${t.split('@').at(0)}!`;
            try {
                await sock.sendMessage(chat, { video: { url: info.url }, gifPlayback: true, caption: caption, mentions: [remitente, t] }, { quoted: msg });
            } catch {
                await sock.sendMessage(chat, { text: caption, mentions: [remitente, t] }, { quoted: msg });
            }
        }
        const fil = { blur: '-blur 0x8', contraste: '-brightness-contrast 10x40', gray: '-colorspace Gray', invert: '-negate', mirror: '-flop', pixel: '-scale 10% -scale 1000%' };
        if (fil[comando]) {
            const cImg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            if (!cImg && !msg.message.imageMessage) return;
            const buf = await downloadMediaMessage(cImg ? { message: msg.message.extendedTextMessage.contextInfo.quotedMessage } : msg, 'buffer', {});
            const inF = `./ed_${Date.now()}.jpg`, outF = `./ed_o_${Date.now()}.jpg`;
            fs.writeFileSync(inF, buf);
            exec(`magick "${inF}" ${fil[comando]} "${outF}"`, async () => {
                if (fs.existsSync(outF)) { await sock.sendMessage(chat, { image: fs.readFileSync(outF) }, { quoted: msg }); fs.unlinkSync(outF); }
                if (fs.existsSync(inF)) fs.unlinkSync(inF);
            });
        }
    });
}
iniciarBot();

