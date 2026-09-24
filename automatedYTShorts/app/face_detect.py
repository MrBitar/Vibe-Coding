"""Shared Haar-cascade face detection, used by both vertical.py (to pick a
crop position) and thumbnail.py (to pick a thumbnail frame)."""

import cv2

_cascades = {}


def get_cascade(filename: str):
    if filename not in _cascades:
        _cascades[filename] = cv2.CascadeClassifier(cv2.data.haarcascades + filename)
    return _cascades[filename]


def detect_faces(gray, min_size):
    """Try frontal, then profile, then profile-on-flipped-frame (the profile
    cascade only detects one facing direction), returning whichever succeeds."""
    frontal = get_cascade("haarcascade_frontalface_default.xml").detectMultiScale(
        gray, scaleFactor=1.2, minNeighbors=5, minSize=min_size)
    if len(frontal) > 0:
        return frontal

    profile = get_cascade("haarcascade_profileface.xml")
    faces = profile.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=4, minSize=min_size)
    if len(faces) > 0:
        return faces

    flipped = cv2.flip(gray, 1)
    faces = profile.detectMultiScale(flipped, scaleFactor=1.2, minNeighbors=4, minSize=min_size)
    width = gray.shape[1]
    return [(width - x - w, y, w, h) for (x, y, w, h) in faces]


def min_size_for_frame(gray) -> tuple:
    """A fixed pixel threshold (e.g. 60px) is far too permissive on 4K source
    video and picks up noise as "faces" - scale the minimum detectable face
    size with the frame's own dimensions instead."""
    return (int(gray.shape[1] * 0.1), int(gray.shape[0] * 0.1))
