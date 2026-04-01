"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  sendCallSignal,
  type ChatSocketPayload,
  type OutgoingCallSignal,
} from "@/lib/socket";

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "connected";

export type IncomingCallInfo = {
  callId: string;
  chatId: string;
  mediaType: "AUDIO" | "VIDEO";
  fromUserId: string;
  displayName: string;
};

function parseMedia(m: string | undefined): "AUDIO" | "VIDEO" {
  return m === "VIDEO" ? "VIDEO" : "AUDIO";
}

function buildIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as RTCIceServer[];
    } catch {
      /* use default */
    }
  }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

type UseWebRtcCallOptions = {
  chatId: string | null;
  peerUserId: string | null;
  isGroup: boolean;
  selfUserId: string | null;
  getDisplayNameForChat: (chatId: string) => string;
};

export function useWebRtcCall(options: UseWebRtcCallOptions) {
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const phaseRef = useRef<CallPhase>("idle");
  useEffect(() => {
    phaseRef.current = callPhase;
  }, [callPhase]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const mediaTypeRef = useRef<"AUDIO" | "VIDEO">("AUDIO");
  const roleRef = useRef<"caller" | "callee" | null>(null);
  const pendingOfferSdpRef = useRef<string | null>(null);
  const chatIdRef = useRef(options.chatId);
  const selfIdRef = useRef(options.selfUserId);
  const incomingRef = useRef<IncomingCallInfo | null>(null);
  const getDisplayNameRef = useRef(options.getDisplayNameForChat);

  useEffect(() => {
    chatIdRef.current = options.chatId;
  }, [options.chatId]);
  useEffect(() => {
    selfIdRef.current = options.selfUserId;
  }, [options.selfUserId]);
  useEffect(() => {
    incomingRef.current = incoming;
  }, [incoming]);
  useEffect(() => {
    getDisplayNameRef.current = options.getDisplayNameForChat;
  }, [options.getDisplayNameForChat]);

  const cleanupPeer = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setVideoOff(false);
    callIdRef.current = null;
    roleRef.current = null;
    mediaTypeRef.current = "AUDIO";
    pendingOfferSdpRef.current = null;
    setIncoming(null);
    setCallPhase("idle");
  }, []);

  const emit = useCallback((partial: Omit<OutgoingCallSignal, "chatId">) => {
    const cid = chatIdRef.current;
    if (!cid) return false;
    return sendCallSignal({
      chatId: cid,
      ...partial,
    } as OutgoingCallSignal);
  }, []);

  const attachPeerHandlers = useCallback(
    (pc: RTCPeerConnection) => {
      pc.ontrack = (ev) => {
        const [s] = ev.streams;
        if (s) setRemoteStream(s);
      };
      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !callIdRef.current) return;
        const c = ev.candidate;
        emit({
          action: "ICE",
          callId: callIdRef.current,
          mediaType: mediaTypeRef.current,
          iceCandidate: {
            candidate: c.candidate,
            sdpMid: c.sdpMid,
            sdpMLineIndex: c.sdpMLineIndex,
          },
        });
      };
      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setCallError("Call connection lost.");
          cleanupPeer();
        }
      };
    },
    [cleanupPeer, emit],
  );

  const endCall = useCallback(() => {
    const id = callIdRef.current;
    const cid = chatIdRef.current;
    if (id && cid) {
      emit({
        action: "HANGUP",
        callId: id,
        mediaType: mediaTypeRef.current,
      });
    }
    cleanupPeer();
  }, [cleanupPeer, emit]);

  const cancelOutgoing = useCallback(() => {
    const id = callIdRef.current;
    const cid = chatIdRef.current;
    if (id && cid && phaseRef.current === "outgoing") {
      emit({
        action: "CANCEL",
        callId: id,
        mediaType: mediaTypeRef.current,
      });
    }
    cleanupPeer();
  }, [cleanupPeer, emit]);

  const startCall = useCallback(
    async (media: "AUDIO" | "VIDEO") => {
      setCallError(null);
      if (
        options.isGroup ||
        !options.chatId ||
        !options.peerUserId ||
        !options.selfUserId
      ) {
        setCallError("Voice and video calls work only in direct chats.");
        return;
      }
      if (phaseRef.current !== "idle") return;

      const callId = crypto.randomUUID();
      callIdRef.current = callId;
      mediaTypeRef.current = media;
      roleRef.current = "caller";
      chatIdRef.current = options.chatId;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: media === "VIDEO",
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        attachPeerHandlers(pc);

        sendCallSignal({
          action: "INVITE",
          chatId: options.chatId,
          callId,
          mediaType: media,
        });
        setCallPhase("outgoing");
      } catch {
        setCallError("Microphone or camera permission denied.");
        cleanupPeer();
      }
    },
    [
      attachPeerHandlers,
      cleanupPeer,
      options.chatId,
      options.isGroup,
      options.peerUserId,
      options.selfUserId,
    ],
  );

  const acceptCall = useCallback(async () => {
    const inv = incoming;
    if (!inv || !options.selfUserId) return;
    setCallError(null);
    callIdRef.current = inv.callId;
    mediaTypeRef.current = inv.mediaType;
    roleRef.current = "callee";
    chatIdRef.current = inv.chatId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: inv.mediaType === "VIDEO",
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      attachPeerHandlers(pc);

      sendCallSignal({
        action: "ACCEPT",
        chatId: inv.chatId,
        callId: inv.callId,
        mediaType: inv.mediaType,
      });

      setIncoming(null);
      setCallPhase("connecting");

      const pending = pendingOfferSdpRef.current;
      pendingOfferSdpRef.current = null;
      if (pending) {
        await pc.setRemoteDescription({ type: "offer", sdp: pending });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendCallSignal({
          action: "ANSWER",
          chatId: inv.chatId,
          callId: inv.callId,
          mediaType: inv.mediaType,
          sdp: answer.sdp ?? undefined,
        });
        setCallPhase("connected");
      }
    } catch {
      setCallError("Could not answer the call.");
      sendCallSignal({
        action: "REJECT",
        chatId: inv.chatId,
        callId: inv.callId,
        mediaType: inv.mediaType,
      });
      cleanupPeer();
    }
  }, [attachPeerHandlers, cleanupPeer, incoming, options.selfUserId]);

  const rejectCall = useCallback(() => {
    if (incoming) {
      sendCallSignal({
        action: "REJECT",
        chatId: incoming.chatId,
        callId: incoming.callId,
        mediaType: incoming.mediaType,
      });
    }
    cleanupPeer();
  }, [cleanupPeer, incoming]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audio = stream.getAudioTracks()[0];
    if (!audio) return;
    const next = !audio.enabled;
    audio.enabled = next;
    setMuted(!next);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const video = stream.getVideoTracks()[0];
    if (!video) return;
    const next = !video.enabled;
    video.enabled = next;
    setVideoOff(!next);
  }, []);

  const handleRemoteSignal = useCallback(
    (payload: ChatSocketPayload) => {
      if (payload.eventType !== "CALL" || !payload.action || !payload.callId) {
        return;
      }
      const signalCallId = payload.callId;
      const signalAction = payload.action;

      const self = selfIdRef.current ?? "";
      const remoteUser = payload.fromUserId ?? payload.senderId;
      if (
        remoteUser &&
        self &&
        remoteUser === self &&
        signalAction !== "ICE"
      ) {
        return;
      }

      const run = async () => {
        if (signalAction === "INVITE") {
          if (phaseRef.current !== "idle") {
            sendCallSignal({
              action: "REJECT",
              chatId: payload.chatId,
              callId: signalCallId,
              mediaType: parseMedia(payload.mediaType),
            });
            return;
          }
          const displayName = getDisplayNameRef.current(payload.chatId);
          setIncoming({
            callId: signalCallId,
            chatId: payload.chatId,
            mediaType: parseMedia(payload.mediaType),
            fromUserId: remoteUser ?? "",
            displayName,
          });
          setCallPhase("incoming");
          return;
        }

        if (signalAction === "OFFER" && payload.sdp) {
          const inv = incomingRef.current;
          if (
            inv &&
            inv.callId === signalCallId &&
            phaseRef.current === "incoming"
          ) {
            pendingOfferSdpRef.current = payload.sdp;
            return;
          }
          if (
            roleRef.current === "callee" &&
            signalCallId === callIdRef.current &&
            pcRef.current
          ) {
            await pcRef.current.setRemoteDescription({
              type: "offer",
              sdp: payload.sdp,
            });
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            sendCallSignal({
              action: "ANSWER",
              chatId: payload.chatId,
              callId: signalCallId,
              mediaType: mediaTypeRef.current,
              sdp: answer.sdp ?? undefined,
            });
            setCallPhase("connected");
          }
          return;
        }

        if (signalCallId !== callIdRef.current) {
          return;
        }

        if (signalAction === "ACCEPT" && roleRef.current === "caller") {
          const pc = pcRef.current;
          if (!pc) return;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendCallSignal({
            action: "OFFER",
            chatId: payload.chatId,
            callId: signalCallId,
            mediaType: mediaTypeRef.current,
            sdp: offer.sdp ?? undefined,
          });
          setCallPhase("connected");
          return;
        }

        if (signalAction === "ANSWER" && payload.sdp) {
          if (roleRef.current === "caller") {
            await pcRef.current?.setRemoteDescription({
              type: "answer",
              sdp: payload.sdp,
            });
          }
          return;
        }

        if (signalAction === "ICE" && payload.iceCandidate && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate({
              candidate: payload.iceCandidate.candidate,
              sdpMid: payload.iceCandidate.sdpMid ?? undefined,
              sdpMLineIndex:
                payload.iceCandidate.sdpMLineIndex ?? undefined,
            });
          } catch {
            /* ignore stale candidates */
          }
          return;
        }

        if (
          signalAction === "REJECT" ||
          signalAction === "CANCEL" ||
          signalAction === "HANGUP"
        ) {
          cleanupPeer();
        }
      };

      void run();
    },
    [cleanupPeer],
  );

  useEffect(() => {
    if (!options.chatId || !options.peerUserId) return;
    if (phaseRef.current === "idle") return;
    if (callIdRef.current && chatIdRef.current !== options.chatId) {
      queueMicrotask(() => {
        endCall();
      });
    }
  }, [options.chatId, options.peerUserId, endCall]);

  return {
    callPhase,
    incoming,
    localStream,
    remoteStream,
    muted,
    videoOff,
    callError,
    setCallError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    cancelOutgoing,
    toggleMute,
    toggleVideo,
    handleRemoteSignal,
  };
}
