import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import { Button, Input } from 'antd';
import { UserOutlined } from '@ant-design/icons';

import stylesheet from "./MainScreen.module.scss";

const socket = io("http://localhost:5050");

export const MainScreen = () => {
  const myVideoStream = useRef();
  const userVideoStream = useRef();
  const connection = useRef();

  const [stream, setStream] = useState();
  const [call, setCall] = useState({});

  const [inReceiving, setInReceiving] = useState(false);
  const [inProgress, setInProgress] = useState(false);

  const [myId, setMyId] = useState("");
  const [guestId, setGuestId] = useState("");

  const [mediaDevicesError, setMediaDevicesError] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        myVideoStream.current.srcObject = stream;
      })
      .catch((error) => {
        setMediaDevicesError(true);
        console.info('# mediaDevicesError:', error)
      });

    socket.on("init", (id) => setMyId(id));

    socket.on("callUser", ({ from, signal }) => {
      setInReceiving(true);
      setCall({ from, signal });
    });
  }, []);

  const answerCall = () => {
    setInProgress(true);

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (signal) => {
      socket.emit("answerCall", { signal, to: call.from });
    });

    peer.on("stream", (stream) => {
      userVideoStream.current.srcObject = stream;
    });

    peer.signal(call.signal);
    connection.current = peer;
  };

  const callUser = () => {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (signal) => {
      socket.emit("callUser", {
        to: guestId,
        from: myId,
        signal,
      });
    });

    peer.on("stream", (currentStream) => {
      userVideoStream.current.srcObject = currentStream;
    });

    socket.on("callAccepted", ({ signal }) => {
      setInProgress(true);
      peer.signal(signal);
    });

    connection.current = peer;
  };

  const leaveCall = () => {
    setInProgress(false);
    connection.current.destroy();
  };

  const handleStopAudio = () => {
    stream.getAudioTracks().forEach(track => ({...track, enabled: !track.enabled}));
  }

  const handleStopVideo = () => {
    console.info("##", stream.getVideoTracks());
    stream.getVideoTracks().forEach(track => ({...track, enabled: !track.enabled}));
  }

  const renderMainControls = () => {
    return (
      <div className={stylesheet.controlsBlock}>
        <div>Your id is: "{myId}" or Enter guest id</div>
        <Input onChange={(event) => setGuestId(event.target.value)}/>
        <Button onClick={callUser} disabled={inReceiving}>
          Call
        </Button>

        {inReceiving && (
          <Button onClick={answerCall}>
            Answer
          </Button>
        )}
      </div>
    );
  }

  const renderVideoControls = () => {
    return (
      <div className={stylesheet.controlsBlock}>
        <Button onClick={handleStopAudio}>Stop audio</Button>
        <Button onClick={handleStopVideo}>Stop video</Button>
        <Button onClick={leaveCall}>End call</Button>
      </div>
    );
  }

  const renderControls = () => {
    if (mediaDevicesError) return;

    return inProgress ? renderVideoControls() : renderMainControls();
  }

  const renderMediaDevicesErrorBlock = () => {
    return (
      <div>
        <div>You need to accept camera and mic permission yo use video chat</div>
        <UserOutlined size={180} />
      </div>
    )
  }

  const renderVideoContainer = () => {
    return (
      <div className={stylesheet.videoContainer}>

        <div className={stylesheet.videBlock}>
          <div>You</div>
          <video
            className={stylesheet.video}
            ref={myVideoStream}
            playsInline
            muted
            autoPlay
          />
        </div>

        {inProgress && <div className={stylesheet.videBlock}>
          <div>Guest</div>
          <video
            className={stylesheet.video}
            ref={userVideoStream}
            playsInline
            autoPlay
          />
        </div>}
      </div>
    )
  }

  const renderContent = () => {
    return mediaDevicesError ? renderMediaDevicesErrorBlock() : renderVideoContainer();
  }

  return (
    <div className={stylesheet.root}>
      <h1>Video chat</h1>
      {renderContent()}
      {renderControls()}
    </div>
  )
};
