var URL_BASE = 'http://rtc-socketio-benchmarking.herokuapp.com/';
var socket = getConnection();

var $ = require('jquery');
var commonrtc = require('./commonRTC');

var messageCount = 0;
var serverEasyrtcid;

$(function(){
    $('#send').click(sendData);
    commonrtc.setRTCCustomListeners = setCustomListener;

    commonrtc.configureRTCDataChannel();
    configureSocketIO();    
});

function configureSocketIO(){
    $('#connectionSocketIO').parent().removeClass("red");
    $('#connectionSocketIO').parent().addClass("green");
}

function setCustomListener(){
    easyrtc.setRoomOccupantListener(automaticStartCall);
}

function automaticStartCall(roomName, occupantList) {
	commonrtc.connectList = occupantList;
    var numberOfOccupants = Object.keys(occupantList).length;
    console.log("Occupant list updated, size: " + numberOfOccupants);
    if(numberOfOccupants > 0) {
    	for (var easyrtcid in commonrtc.connectList) {
            console.log("Room occupant: " + easyrtcid);
    		startCall(easyrtcid);
    		serverEasyrtcid = easyrtcid;
    	}
    } else {
        document.getElementById("send").disabled = true;
        console.log("Not connected to any peer via datachannel");
        $('#connectionRTC').parent().removeClass("green");
        $('#connectionRTC').parent().addClass("red");
    }
}

function startCall(otherEasyrtcid) {
    if (easyrtc.getConnectStatus(otherEasyrtcid) === easyrtc.NOT_CONNECTED) {
        try {
            easyrtc.call(otherEasyrtcid,
                function(caller, media) {
                    if (media === 'datachannel') {
                        document.getElementById("send").disabled = false;
                        console.log("Connected to peer via datachannel");
                        //$('#connectionRTC').html("RTC Connected");
                        $('#connectionRTC').parent().removeClass("red");
                        $('#connectionRTC').parent().addClass("green");
                        commonrtc.connectList[otherEasyrtcid] = true;
                    }
                },
                function(errorCode, errorText) {
                    commonrtc.connectList[otherEasyrtcid] = false;
                    easyrtc.showError(errorCode, errorText);
                },
                function(wasAccepted) {
                    console.log("Was accepted = " + wasAccepted);
                });
        } catch(callerror) {
            console.log("Saw call error ", callerror);
        }
    } else {
        console.log("Already connected to " + easyrtc.idToName(otherEasyrtcid));
    }
}

function sendData() {
    document.getElementById("send").disabled = true;
    var strData = 'Message';
    messageCount++;

    var jsonData = { message: strData, date: Date.now(), messageId: messageCount };

    sendStuffP2P(serverEasyrtcid, jsonData); // Send message P2P via RTC
    socket.emit('clientMessage', jsonData); // Send SocketIO

    setTimeout(function(){
        document.getElementById("send").disabled = false;
    }, 850);

    $('#log').html('<p>Message Sent! (' + messageCount + ')</p>');

    socket.emit('deviceInfo', navigator.userAgent);
}

function sendStuffP2P(otherEasyrtcid, msg) {
    if (easyrtc.getConnectStatus(otherEasyrtcid) === easyrtc.IS_CONNECTED) {
        easyrtc.sendDataP2P(otherEasyrtcid, 'msg', msg);
        console.log("Message sent to " + otherEasyrtcid);
    } else {
        easyrtc.showError("", "Not connected to " + easyrtc.idToName(otherEasyrtcid) + " yet.");
    }
}

function getConnection(){
    return io.connect(URL_BASE);
}