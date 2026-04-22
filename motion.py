import cv2
import time
import imutils

# Start camera (try 0, 1, 2 depending on your system)
cam = cv2.VideoCapture(0)

# Initialize variables
firstFrame = None
area = 500  # minimum contour area to detect motion

while True:
    ret, img = cam.read()
    text = "Normal"

    # If frame not captured properly
    if not ret:
        break

    # Resize frame
    img = imutils.resize(img, width=500)

    # Convert to grayscale
    grayImg = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur the image (reduce noise)
    gaussianImg = cv2.GaussianBlur(grayImg, (21, 21), 0)

    # Initialize first frame
    if firstFrame is None:
        firstFrame = gaussianImg
        continue

    # Compute difference between current frame and first frame
    imgDiff = cv2.absdiff(firstFrame, gaussianImg)

    # Thresholding to get binary image
    threshImg = cv2.threshold(imgDiff, 25, 255, cv2.THRESH_BINARY)[1]

    # Dilate to fill gaps
    threshImg = cv2.dilate(threshImg, None, iterations=2)

    # Find contours
    cnts = cv2.findContours(threshImg.copy(), cv2.RETR_EXTERNAL,
                            cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    # Loop through contours
    for c in cnts:
        if cv2.contourArea(c) < area:
            continue

        # Get bounding box
        (x, y, w, h) = cv2.boundingRect(c)

        # Draw rectangle on moving object
        cv2.rectangle(img, (x, y), (x + w, y + h),
                      (0, 255, 0), 2)

        text = "Moving Object Detected"

    # Display text
    cv2.putText(img, "Status: {}".format(text),
                (10, 20), cv2.FONT_HERSHEY_SIMPLEX,
                0.5, (0, 0, 255), 2)

    # Show windows
    cv2.imshow("Camera", img)
    cv2.imshow("Threshold", threshImg)
    cv2.imshow("Difference", imgDiff)

    key = cv2.waitKey(1) & 0xFF

    # Press 'q' to exit
    if key == ord("q"):
        break

# Release camera and close windows
cam.release()
cv2.destroyAllWindows()