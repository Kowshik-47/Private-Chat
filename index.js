const popUpHeading = document.getElementById('pop-up-heading')
const copyIcon = document.getElementById('icon-copy')
const successIcon = document.getElementById('icon-success')

const copyButton = document.getElementById('copy-btn')
const shareButton = document.getElementById('share-btn')
const connectButton = document.getElementById('connect-btn')
const closeButton = document.getElementById('close-btn')

const popup = document.getElementById('link-popup')
const linkInp = document.getElementById('link-inp')
const chatDisplay = document.getElementById('chat-display')

const chatHeader = document.getElementById('chat-header')
const statusText = document.getElementById('status-text')
const respomseIn =  document.getElementById('response-in')
const msgInput = document.getElementById('msg-input')

const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
let isHost = false
let inviteUrl = undefined, inviteToken = undefined, responseToken = undefined

clsoeButton.addEventListener('click', () => {
    popup.close()
    
    popUpHeading.innerHTML = 'Paste The Response Here'
    copyButton.style.display = 'none'
    shareButton.style.display = 'none'
    connectButton.classList.remove('hidden')

    linkInp.innerHTML = ` <input id='response-in' type='text' required> `
    closeButton.style.display = 'none'
    if (isHost) setTimeout(() => popup.showModal(), 1000)
})

pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState
    updateStatusUI(state)
    console.log(state)

    if (state === "failed" || state === "closed") {
        appendMessage("SYSTEM", "⚠️ PEER DISCONNECTED. Terminal closing...")
        msgInput.disabled = true
        msgInput.placeholder = "Connection Lost"
    }
};

async function createInvite() {
    const dc = pc.createDataChannel("chat");
    setupChat(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    pc.onicecandidate = (e) => {
        if (!e.candidate) { 
            inviteToken = btoa(JSON.stringify(pc.localDescription));
            inviteUrl = window.location.origin + window.location.pathname + "#invite=" + inviteToken;
            popup.showModal()
        }
    };
}

async function acceptInvite(token) {
    pc.ondatachannel = (e) => setupChat(e.channel);
    
    try{
        const offer = new RTCSessionDescription(JSON.parse(atob(token)));
        await pc.setRemoteDescription(offer);
    } catch {
        alert('Invalid Chat Link ! Try Again')
    }
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    pc.onicecandidate = (e) => {
        if (!e.candidate) {
            responseToken = btoa(JSON.stringify(pc.localDescription));
            popUpHeading.innerHTML = 'Response Code Generated'
            popup.showModal()
        }
    };
}

async function connect() {
    const response = responseIn.value;
    try{
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(response))))
        popup.close()
    } catch {
        alert('Invalid Chat Session Code ! Try Again')
    }
}

function copyToClipboard() {
    navigator.clipboard.writeText(inviteUrl || responseToken).then(() => {
        copyIcon.classList.add("hidden");
        successIcon.classList.remove("hidden");
        setTimeout(() => {
            successIcon.classList.add("hidden");
            copyIcon.classList.remove("hidden");
        }, 2000);
    });
}

async function share() {
    const shareData = {
        title: 'Private Chat Invite',
    };
    if (inviteUrl) shareData['url'] = inviteUrl
    if (responseToken) shareData['text'] = responseToken

    await navigator.share(shareData)
}

function setupChat(channel) {
    window.dc = channel;
    channel.onopen = () => {
        document.getElementById('chat-interface').style.display = 'block';
        appendMessage('SYSTEM', 'Private Chat Connection Established')
    };

    channel.onmessage = (e) => {
        appendMessage("PEER", e.data);
    };

    channel.onerror = (err) => alert('Invalid Session Code ! Try Again')
    
    channel.onclose = () => {
        appendMessage("SYSTEM", "PEER LEFT THE VAULT.");
        document.getElementById('msg-input').disabled = true;
    };
}

function sendMsg() {
    const text = msgInput.value;
    
    if (text && window.dc && window.dc.readyState === "open") {
        window.dc.send(text);
        appendMessage("YOU", text);
        input.value = ""; 
    } else {
        alert('Can\' send message')
    }
}

function appendMessage(sender, text) {
    const msgWrapper = document.createElement('div');
    
    const timeString = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    }).toLowerCase(); 

    if (sender === "SYSTEM") {
        msgWrapper.className = 'sys-msg'
        msgWrapper.innerText = text;
    } else {
        msgWrapper.setAttribute('class', sender === "YOU" ? "msg-self" : "msg-peer");
        
        msgWrapper.innerHTML = `
            <span class="msg-text">${text}</span>
            <span class="msg-time">${timeString}</span>
        `;
    }

    chatDisplay.appendChild(msgWrapper);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

function updateStatusUI(state) { 
    chatHeader.classList.remove('status-online', 'status-offline', 'status-connecting');

    switch(state) {
        case 'connected':
            chatHeader.classList.add('status-online');
            statusText.innerText = "Active";
            break;
        case 'connecting':
            chatHeader.classList.add('status-connecting');
            statusText.innerText = "Connecting ...";
            break;
        case 'disconnected':
        case 'failed':
        case 'closed':
            chatHeader.classList.add('status-offline');
            statusText.innerText = "Closed";
            break;
    }
}

document.getElementById('msg-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMsg();
});

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('live-clock').innerText = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
        }).toLowerCase();
    }, 1000);
}
startClock()

window.onload = async () => {
    const hash = window.location.hash;
    if (hash.startsWith('#invite=')) {
        inviteToken = hash.replace('#invite=', '');
        await acceptInvite(inviteToken);
    } else {
        isHost = true
        createInvite()
    }
};
