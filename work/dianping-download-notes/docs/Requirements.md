1. Make sure we're on the "笔记" tab. Let's call this the home page thereafter.
2. Click on a note; it will go to the next page (as shown in screenshots/home-page.jpg).
3. Download the picture:
	1. Click the picture to show the full image (as shown in screenshots/note-page.jpg).
	2. Click "..." at the top right corner to show "保存图片".
	3. Click "保存图片"; it will show "保存成功" at the lower part of the page.
	4. Look at the top of the page; it shows "1/7", which means this is the first image out of a total of 7.
	5. Swipe the screen to show the next picture; it will show "2/7" (as shown in screenshots/image-page.jpg).
	6. Repeat steps 2-3 to download the picture.
	7. Repeat the above until we've downloaded all the pictures. (We can tell the last one by "7/7".)
4. Click the "<" at the top left corner (or call the back() method) to return to the step 2 page.
5. Capture all the text of the note. We usually need to scroll down the screen to see all the text, depending on how long the note is. The note ends above the restaurant name (as shown in screenshots/note-text.jpg).
6. Also, capture the name of the restaurant. To do this, click the component with the restaurant name; it will show another page (as shown in screenshots/restaurant-info.jpg) with the full name of the restaurant under "商户详情".
7. Go back to the note page.
8. We don't need to capture the user comments at the bottom part of the page.
9. Put the text and pictures into a markdown file. We're done downloading one note. Go back to the home page.
10. Download the next note. We may need to scroll the screen after downloading some notes.
11. Here are some questions for you:
	1. We won't download all the notes in one go. We may want to accept an argument when running the script for how many notes we are going to download this time.
	2. How can we remember where we were, since we don't want to duplicate what we have downloaded?