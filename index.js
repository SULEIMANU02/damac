const { DisconnectReason, makeWASocket, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const useMongoDBAuthState = require('./mongoAuthState');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const express = require('express');
const { fetchAirtel, fetchGlo, fetchMobile, fetchMtn } = require('./plans');

const app = express();
const PORT = process.env.PORT || 3000;

const mongoURL = "mongodb+srv://maisamira6:S4u3l2e14321@cluster0.rm2ysfe.mongodb.net/?appName=Cluster0";

const userStates = new Map();
const userIndex = new Map();
const beneficiary = new Map();
const usernetwork = new Map();
const airtimeAmount = new Map();
const userDataType = new Map();

let mongoClient;
let isConnected = false;
let shouldClearAuth = false; // Flag to control when to clear auth

async function connectToWhatsApp() {
    try {
        // Connect to MongoDB
        if (!mongoClient) {
            mongoClient = new MongoClient(mongoURL, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            await mongoClient.connect();
            console.log('✅ Connected to MongoDB');
        }

        const db = mongoClient.db("whatsapp_api");
        const collection = db.collection("auth_info_baileys");

        // Only clear auth if explicitly needed (e.g., after logout or auth error)
        if (shouldClearAuth) {
            console.log('🗑️  Clearing authentication data...');
            await collection.deleteMany({});
            console.log('✅ Auth cleared');
            shouldClearAuth = false;
        }

        const { state, saveCreds } = await useMongoDBAuthState(collection);
        const { version } = await fetchLatestBaileysVersion();

        console.log('✅ Auth state initialized');

        const sock = makeWASocket({
            auth: state,
            version,
            logger: pino({ level: 'silent' }),
            browser: ['Chrome (Linux)', '', ''],
            printQRInTerminal: false,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            defaultQueryTimeoutMs: undefined,
            getMessage: async (key) => {
                return { conversation: '' };
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.clear();
                console.log('\n==============================================');
                console.log('📱  SCAN QR CODE TO CONNECT WHATSAPP');
                console.log('==============================================\n');
                qrcode.generate(qr, { small: true });
                console.log('\n💡 How to scan:');
                console.log('1. Open WhatsApp on your phone');
                console.log('2. Go to Settings > Linked Devices');
                console.log('3. Tap "Link a Device"');
                console.log('4. Scan the QR code above\n');
                console.log('==============================================\n');
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log('\n❌ Connection closed');
                console.log('Status Code:', statusCode);
                console.log('Error:', lastDisconnect?.error?.message || 'Unknown');

                // Set flag to clear auth only on specific error codes
                if (statusCode === 405 || statusCode === 401 || statusCode === 403) {
                    console.log('\n⚠️  Auth issue detected - will clear on next connection');
                    shouldClearAuth = true;
                    isConnected = false;
                }

                if (shouldReconnect) {
                    console.log('🔄 Reconnecting in 5 seconds...\n');
                    setTimeout(() => {
                        connectToWhatsApp();
                    }, 5000);
                } else {
                    console.log('🔒 Logged out - clearing auth\n');
                    shouldClearAuth = true;
                    if (mongoClient) await mongoClient.close();
                    process.exit(0);
                }
            } else if (connection === 'open') {
                console.clear();
                console.log('\n==============================================');
                console.log('✅  SUCCESSFULLY CONNECTED TO WHATSAPP!');
                console.log('==============================================');
                console.log('🤖  Damac Sub Bot is now active');
                console.log('📱  Ready to receive messages');
                console.log('⏰  Started at:', new Date().toLocaleString());
                console.log('==============================================\n');
                isConnected = true;
                shouldClearAuth = false; // Reset flag on successful connection
            } else if (connection === 'connecting') {
                console.log('🔄 Connecting to WhatsApp...');
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on("messages.upsert", async (messageInfoUpsert) => {
            try {
                const message = messageInfoUpsert.messages?.[0];
                if (!message) return;

                const text = message?.message?.conversation || message?.message?.extendedTextMessage?.text || '';

                if (message.key.fromMe) {
                    console.log('⏭️  Skipping own message');
                    return;
                }

                const chatId = message.key.remoteJid;
                if (!chatId || !chatId.includes('@s.whatsapp.net')) {
                    console.log('⏭️  Skipping non-user message');
                    return;
                }

                console.log('✅ Processing message from:', chatId);
                console.log('📝 Message text:', text);

                const phoneNumber = chatId.split('@')[0];
                const modifiedPhoneNumber = '0' + phoneNumber.slice(3);
                const currentState = userStates.get(chatId);

                console.log('🔄 Current state:', currentState || 'NEW_USER');

                const InvalidCmd = `⚠️ *Invalid Command* ⚠️

❌ ⚡️⚡️ ❌
Sorry, i don't understand the command entered.

Note: Always ensure you respond with the menu number

if you have any issue, please contact our support team: 09065014762

Press #️⃣ to go back to the main menu or reply with the appropriate menu number`;

                const send = async (text) => {
                    console.log('📤 Sending response...');
                    await sock.sendMessage(chatId, { text });
                    console.log('✅ Response sent');
                };

                try {
                    const phpScriptUrl = 'https://damacsub.com/botpanel/users.php';
                    const response = await axios.post(
                        phpScriptUrl,
                        new URLSearchParams({ phone: modifiedPhoneNumber }),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                    );

                    console.log('response', response.data);
                    const names = `${response.data.first_name || 'N/A'} ${response.data.last_name || 'N/A'}`;
                    const balance = response.data.balance || 'N/A';
                    const account = response.data.account || 'N/A';

                    const welcomeMessage = `*Good Day, ${names}* 🎉,
\n🤑 *Available Balance: ₦${balance === "N/A" ? '0' : balance}*

${account === 'Not available' ? 'generate account number from your dashboard' :
                            `\n💰 *Acc No: ${account}*
💰 *Bank: Palmpay Bank*`}
\nPay Bills Below 👇
\n*Reply with number*
1️⃣ Buy Data
2️⃣ Buy Airtime
3️⃣ Fund Wallet
4️⃣ Talk to Support
\n⚡️https://damacsub.com/ ⚡️`;

                    if (!currentState) {
                        if (response.data && response.data.success) {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(`Hello, I'm *damacsub AI* from *Damac Sub*.

It seems you haven't created a *Damac Sub* account yet, or the phone number connected to your WhatsApp is different from the one on your *Damac Sub* account.

Please create an account to use our services:
🔗 *Register here*: https://damacsub.com/mobile/register

If you already have an account, contact admin to update your phone number: 09065014762`);
                            userStates.set(chatId, '');
                        }
                        return;
                    }

                    else if (currentState === 'MAIN_MENU') {
                        switch (text) {
                            case '1':
                                await send(`*📲Buy DATA📱*

Please select your *Network*

Reply with menu number

1️⃣ MTN
2️⃣ AIRTEL
3️⃣ GLO
4️⃣ 9MOBILE


*Note*:  Reply with #️⃣ to go back to the main menu`);
                                userStates.set(chatId, 'BUY_DATA');
                                break;
                            case '2':
                                await send(`*📲Buy AIRTIME*

Please select your *Network*

Reply with menu number

1️⃣ MTN
2️⃣ AIRTEL
3️⃣ GLO
4️⃣ 9MOBILE


*Note*:  Reply with #️⃣ to go back to the main menu`);
                                userStates.set(chatId, 'BUY_AIRTIME');
                                break;
                            case '3':
                                await send(`Send the amount you want to fund, you'll be credited in 20seconds - 5minutes

*Account number: ${account}*
*Account name: ${names}*
*Bank name: Palmpay*

*Note*:  Reply with #️⃣ to go back to the main menu`);
                                break;
                            case '4':
                                await send(`*Need Help? Contact our team ASAP*: 09065014762

Or you can also join our WhatsApp WhatsApp below to get update from us, join here 
👇👇👇👇👇👇👇👇
https://chat.whatsapp.com/LrKi1ju7JCt8FH6N6IJFpG

*Note*: enter "#" to go back to menu`);
                                break;
                            case '#':
                                await send(welcomeMessage);
                                userStates.set(chatId, 'MAIN_MENU');
                                break;
                            default:
                                await send(InvalidCmd);
                        }
                        return;
                    }

                    else if (currentState === 'BUY_DATA') {
                        const networkMap = {
                            '1': 'mtn',
                            '2': 'airtel',
                            '3': 'glo',
                            '4': '9mobile'
                        };

                        if (text in networkMap) {
                            const network = networkMap[text];
                            usernetwork.set(chatId, network);

                            const documents = await (network === 'mtn' ? fetchMtn() :
                                network === 'airtel' ? fetchAirtel() :
                                    network === 'glo' ? fetchGlo() : fetchMobile());

                            const dataTypes = [...new Set(documents.map(doc => doc.type))];

                            let dataTypeMenu = `*📲 ${network.toUpperCase()} Data Plans*\n\nPlease select *Data Type*:\n\nReply with menu number\n\n`;
                            dataTypes.forEach((type, index) => {
                                dataTypeMenu += `${index + 1}️⃣ ${type}\n`;
                            });
                            dataTypeMenu += `\n*Note*: Reply with #️⃣ to go back to the main menu`;

                            await send(dataTypeMenu);
                            userStates.set(chatId, 'SELECT_DATA_TYPE');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                        return;
                    }

                    else if (currentState === 'SELECT_DATA_TYPE') {
                        const network = usernetwork.get(chatId);
                        const documents = await (network === 'mtn' ? fetchMtn() :
                            network === 'airtel' ? fetchAirtel() :
                                network === 'glo' ? fetchGlo() : fetchMobile());

                        const dataTypes = [...new Set(documents.map(doc => doc.type))];
                        const selectedIndex = parseInt(text, 10);

                        if (!isNaN(selectedIndex) && selectedIndex > 0 && selectedIndex <= dataTypes.length) {
                            const selectedType = dataTypes[selectedIndex - 1];
                            userDataType.set(chatId, selectedType);

                            const filteredPlans = documents.filter(doc => doc.type === selectedType);

                            let plansMenu = `*📲 ${network.toUpperCase()} - ${selectedType} Plans*\n\n`;
                            plansMenu += `Select a data plan:\n\nReply with menu number\n\n`;

                            filteredPlans.forEach((plan, index) => {
                                plansMenu += `${index + 1}️⃣ ${plan.name} - ₦${plan.userprice} (${plan.day} day${plan.day > 1 ? 's' : ''})\n`;
                            });

                            plansMenu += `\n*Note*: Reply with #️⃣ to go back to the main menu`;

                            await send(plansMenu);
                            userStates.set(chatId, 'SELECT_DATA_PLAN');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                        return;
                    }

                    else if (currentState === 'SELECT_DATA_PLAN') {
                        const network = usernetwork.get(chatId);
                        const selectedType = userDataType.get(chatId);
                        const selectedIndex = parseInt(text, 10);

                        const documents = await (network === 'mtn' ? fetchMtn() :
                            network === 'airtel' ? fetchAirtel() :
                                network === 'glo' ? fetchGlo() : fetchMobile());

                        const filteredPlans = documents.filter(doc => doc.type === selectedType);
                        const foundDocument = filteredPlans[selectedIndex - 1];

                        if (!isNaN(selectedIndex) && selectedIndex > 0 && selectedIndex <= filteredPlans.length) {
                            const originalIndex = documents.findIndex(doc => doc.pId === foundDocument.pId);
                            userIndex.set(chatId, originalIndex + 1);

                            const selectedName = `${network.toUpperCase()} ${foundDocument.type} ${foundDocument.name}`;

                            await send(`    📳 *Buy Data* 📳

⚡️⚡️⚡️

You are buying *${selectedName}* DATA PLAN
*Price: ₦${foundDocument.userprice}*
*Validity: ${foundDocument.day} day${foundDocument.day > 1 ? 's' : ''}*

Reply with the  *recipient phone number* .

*Note*:  Reply with #️⃣ to go back to the main menu`);
                            userStates.set(chatId, 'MTN_NUMBER');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                        return;
                    }

                    else if (currentState === 'MTN_NUMBER') {
                        const recipient = text;
                        const recipientString = recipient.toString();
                        const network = usernetwork.get(chatId);
                        const documents = await (network === 'mtn' ? fetchMtn() : network === 'airtel' ? fetchAirtel() : network === 'glo' ? fetchGlo() : fetchMobile());
                        const selectedIndex = userIndex.get(chatId);
                        const foundDocument = documents[selectedIndex - 1];
                        const selectedName = network.toUpperCase() + ' ' + foundDocument.type + ' ' + foundDocument.name;
                        beneficiary.set(chatId, recipient);

                        if (recipientString.length === 11) {
                            await send(`    📳 *Buy Data* 📳

Invoice Generated.

*Package* : ${selectedName}
*Price*: ₦${foundDocument.userprice}
*Validity*: ${foundDocument.day} day${foundDocument.day > 1 ? 's' : ''}
*Recipient*: ${recipientString}

Would you like to process this invoice. Reply with menu number

*1. Yes*
*2. No*`);
                            userStates.set(chatId, 'NUMBER_CONFIRM');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(`📳 *Buy Data* 📳

❌ ⚡️ ⚡️ ❌

You have entered an invalid *recipient phone number*. Please check and send again.

*Note*:  Reply with #️⃣ to go back to the main menu`);
                        }
                    }

                    else if (currentState === 'NUMBER_CONFIRM') {
                        const recipient = beneficiary.get(chatId) || "Unknown Recipient";
                        const selectedIndex = userIndex.get(chatId);
                        const network = usernetwork.get(chatId);
                        const documents = await (network === 'mtn' ? fetchMtn() : network === 'airtel' ? fetchAirtel() : network === 'glo' ? fetchGlo() : fetchMobile());
                        const apikey = response.data.apikey;
                        const foundDocument = documents[selectedIndex - 1];
                        const planid = foundDocument.pId || "Unknown Plan";
                        const networks = network === 'mtn' ? 1 : network === 'glo' ? 2 : network === '9mobile' ? 3 : 4;

                        if (text === '1') {
                            if (userStates.get(chatId) === 'processing') {
                                await send('A transaction is already in progress. Please wait.');
                                return;
                            }

                            userStates.set(chatId, 'processing');
                            const data = {
                                "network": networks,
                                "mobile_number": recipient,
                                "plan": planid,
                                "Ported_number": true
                            };

                            const config = {
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: 'https://damacsub.com/api/data/',
                                headers: {
                                    'Authorization': `Token ${apikey}`,
                                    'Content-Type': 'application/json'
                                },
                                data: data
                            };

                            try {
                                const apiResponse = await axios(config);
                                console.log('API Response:', apiResponse.data);
                                await send(`      📳 *Buy Data* 📳

✅ ⚡️⚡️ ✅
Transaction Completed Successfully.



Thanks for using *Damac Sub*,

Note: Reply with #️⃣ to go back to the main menu`);

                            } catch (error) {
                                console.error('API Error:', error.response?.data || error.message);
                                await send(`    📳 *Buy Data* 📳

❌ ⚡️⚡️ ❌
An error occurred while processing your request. Please try again later.

*Note*: Reply with #️⃣ to go back to the main menu`);
                            } finally {
                                userStates.set(chatId, 'done');
                            }
                        } else if (text === '2') {
                            await send(`   📳 *Buy Data* 📳

⚠️⚡️⚡️⚠️
Transaction has been Cancelled.🥲

We wish to see you again,`);
                            userStates.set(chatId, 'cancel');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                    }

                    else if (currentState === 'BUY_AIRTIME') {
                        const networkMap = {
                            '1': 'mtn',
                            '2': 'airtel',
                            '3': 'glo',
                            '4': '9mobile',
                        };

                        if (text in networkMap) {
                            const network = networkMap[text];
                            usernetwork.set(chatId, network);

                            const menu = `   📳 *Buy Airtime* 📳

⚡️⚡️⚡️

You are buying *${network.toUpperCase()}* Airtime.

Reply with *recipient phone number*.

*Note*: Reply with #️⃣ to go back to the main menu`;

                            await send(menu);
                            userStates.set(chatId, 'airtime_number');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                    }

                    else if (currentState === 'airtime_number') {
                        const recipient = text;
                        const network = usernetwork.get(chatId);
                        beneficiary.set(chatId, recipient);

                        if (recipient.length === 11) {
                            await send(`    📳 *Buy Airtime* 📳

⚡️⚡️⚡️

You are buying *${network}* Airtime For ${recipient}

Please *enter the amount* of airtime you are buying .

*Note*:  Reply with #️⃣ to go back to the main menu`);
                            userStates.set(chatId, 'airtime_amount');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(`    📳 *Buy Airtime* 📳

❌ ⚡️⚡️ ❌

You have entered an *invalid recipient phone number*. Please check and send again.

Note:  Reply with #️⃣ to go back to the main menu`);
                        }
                    }

                    else if (currentState === 'airtime_amount') {
                        const amount = text;
                        const network = usernetwork.get(chatId);
                        const recipient = beneficiary.get(chatId);
                        airtimeAmount.set(chatId, amount);

                        if (amount < 50) {
                            await send(`     📳 *Buy Airtime* 📳

❌ ⚡️⚡️ ❌
The minimum *amount is ₦10*

*Please reply with appropriate Amount* or 👇👇

*Note*: Reply with #️⃣ to go back to the main menu`);
                        } else if (amount >= 50) {
                            await send(`    📳 *Buy Airtime* 📳

⚡️⚡️⚡️

Invoice Generated.

*Service*: ${network} Airtime
*Recipient*: ${recipient}
*Amount*: NGN ${amount}

*Would you like to process this invoice. Reply with menu number*

*1*. Yes
*2*. No`);
                            userStates.set(chatId, 'confirm');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                    }

                    else if (currentState === 'confirm') {
                        const recipient = beneficiary.get(chatId) || "Unknown Recipient";
                        const network = usernetwork.get(chatId);
                        const amount = airtimeAmount.get(chatId);
                        const apikey = response.data.apikey;
                        const networks = network === 'mtn' ? 1 : network === 'glo' ? 2 : network === '9mobile' ? 3 : 4;

                        if (text === '1') {
                            if (userStates.get(chatId) === 'processing') {
                                await send('A transaction is already in progress. Please wait.');
                                return;
                            }

                            userStates.set(chatId, 'processing');
                            const data = {
                                "network": networks,
                                "mobile_number": recipient,
                                "amount": amount,
                                "Ported_number": true,
                                "airtime_type": 'VTU'
                            };

                            const config = {
                                method: 'post',
                                maxBodyLength: Infinity,
                                url: 'https://damacsub.com/api/airtime/',
                                headers: {
                                    'Authorization': `Token ${apikey}`,
                                    'Content-Type': 'application/json'
                                },
                                data: data
                            };

                            try {
                                const apiResponse = await axios(config);
                                console.log('API Response:', apiResponse.data);
                                await send(`      📳 *Buy Airtime* 📳

✅ ⚡️⚡️ ✅
Transaction Completed Successfully.



Thanks for using *Damac Sub*,

Note: Reply with #️⃣ to go back to the main menu`);

                            } catch (error) {
                                console.error('API Error:', error.response?.data || error.message);
                                await send(`    📳 *Buy Airtime* 📳

❌ ⚡️⚡️ ❌
An error occurred while processing your request. Please try again later.

*Note*: Reply with #️⃣ to go back to the main menu`);
                            } finally {
                                userStates.set(chatId, 'done');
                            }
                        } else if (text === '2') {
                            await send(`   📳 *Buy Airtime* 📳

⚠️⚡️⚡️⚠️
Transaction has been Cancelled.🥲

We wish to see you again,`);
                            userStates.set(chatId, 'cancel');
                        } else if (text === '#') {
                            await send(welcomeMessage);
                            userStates.set(chatId, 'MAIN_MENU');
                        } else {
                            await send(InvalidCmd);
                        }
                    }

                    else if (currentState === 'done' || currentState === 'cancel') {
                        await send(welcomeMessage);
                        userStates.set(chatId, 'MAIN_MENU');
                    }

                    else {
                        await send('Processing....');
                    }

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    await send('⚠️ An error occurred. Please try again later.');
                }
            } catch (error) {
                console.error('❌ Error processing message:', error);
            }
        });

    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        if (mongoClient) await mongoClient.close();

        console.log('\n🔄 Retrying in 10 seconds...\n');
        setTimeout(() => {
            connectToWhatsApp();
        }, 10000);
    }
}

// Start Express server
app.get('/', (req, res) => {
    res.send('WhatsApp API is running');
});

console.log('\n==============================================');
console.log('🚀  STARTING DAMAC SUB WHATSAPP BOT');
console.log('==============================================\n');

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    connectToWhatsApp().catch(err => {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    });
});