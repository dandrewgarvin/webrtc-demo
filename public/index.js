const socket = io.connect();
const peerConnection = new window.RTCPeerConnection();

let isAlreadyCalling = false;
let affirmCall = false;

function init() {
  socket.on("user list updated", updateUsers);
  socket.on("incoming call", handleIncomingCall);
  socket.on("call rejected", () => {
    updateStatus("idle - in room");
    alert("Your call has been rejected. Try again later!");
  });

  socket.on("call accepted", async (data) => {
    updateStatus("starting call");
    console.log("Call has been accepted:", data);

    await peerConnection.setRemoteDescription(
      new window.RTCSessionDescription(data.answer)
    );

    if (!isAlreadyCalling) {
      callUser(data.socket, true);
      isAlreadyCalling = true;
    }
  });

  peerConnection.ontrack = function ({ streams }) {
    updateStatus("receiving media stream");
    console.log("receiving a remote stream...");
    const remoteVideo = document.getElementById("remote-video");
    if (!remoteVideo.srcObject) {
      console.log("streams", streams);

      remoteVideo.srcObject = streams[0];
    }
  };
}

init();

function updateStatus(message) {
  let status = document.getElementById("status");
  status.innerText = message;
}

function connect() {
  const userName = document.getElementById("user-name").value;

  socket.emit("join", { name: userName });
  updateStatus("idle - in room");
}

function updateUsers(data) {
  updateStatus("receiving users");
  const users = document.getElementById("user-list");
  users.innerHTML = null;

  data.forEach((user) => {
    const li = document.createElement("li");
    li.id = user.id;
    li.innerText = user.name;
    li.className = "user";
    li.onclick = (event) => callUser(event.target.id);

    users.appendChild(li);
  });

  updateStatus("idle - in room");
}

async function callUser(id, again) {
  updateStatus("calling user");
  console.log("calling user...", again);
  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(
    new window.RTCSessionDescription(offer)
  );

  socket.emit("call user", {
    offer,
    to: id,
  });
}

function getVideoStream() {
  updateStatus("getting video stream");
  navigator.getUserMedia(
    { video: true, audio: true },
    (stream) => {
      const localVideo = document.getElementById("local-video");

      if (!localVideo.srcObject) {
        localVideo.srcObject = stream;
      }

      stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));
    },
    (error) => {
      console.warn(error.message);
    }
  );
}

async function handleIncomingCall(data) {
  updateStatus("receiving call");
  console.log("receiving a call...", affirmCall);
  if (!affirmCall) {
    if (
      !window.confirm(
        `The user ${data.socket} is calling you. Do you want to accept this call?`
      )
    ) {
      console.log("rejecting call...");
      socket.emit("reject call", { from: data.socket });

      return null;
    }
  }

  affirmCall = true;

  updateStatus("accepting call");
  console.log("accepting call...");
  await peerConnection.setRemoteDescription(
    new window.RTCSessionDescription(data.offer)
  );

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(
    new window.RTCSessionDescription(answer)
  );

  socket.emit("accept call", {
    answer,
    from: data.socket,
  });
}
