## Workflow

1. Make sure we're on the "笔记" tab. Let's call this the home page thereafter.
2. Click on a note; it will go to the next page (as shown in screenshots/home-page.jpg).
	- Position Verification: Before clicking, verify the note is properly positioned within the visible screen area:
		- Check if note is fully visible (at least 70% visibility)
		- Ensure note is not too close to screen edges (100px minimum margin)
		- Optionally center the note for better clicking reliability
		- If positioning is inadequate, automatically scroll to adjust the note position
		- Only proceed with click after proper positioning is confirmed
3. Download the picture:
	1. Click the picture to show the full image (as shown in screenshots/note-page.jpg).
	2. Click "..." at the top right corner to show "保存图片".
	3. Click "保存图片"; it will show "保存成功" at the lower part of the page.
	4. Look at the top of the page; it shows "1/7", which means this is the first image out of a total of 7.
	5. Swipe the screen to show the next picture; it will show "2/7" (as shown in screenshots/image-page.jpg).
	6. Repeat steps 2-3 to download the picture.
	7. Repeat the above until we've downloaded all the pictures. (We can tell the last one by "7/7".)
4. Click the "<" at the top left corner (or call the back() method) to return to the step 2 page.
5. After downloading all images from the note:
	1. Copy all PNG images from `/Pictures` directory to organized structure. 
	2. In the organized structure folder, convert each PNG image to JPG format with optimal quality settings.
	3. Compare file sizes and compression ratios to ensure quality preservation.
	4. Keep both PNG and JPG versions temporarily, then delete PNG files after successful conversion. Keep the original PNG files in `/Pictures`.
	5. Update file paths in metadata to use JPG versions.
6. Capture all the text of the note. We usually need to scroll down the screen to see all the text, depending on how long the note is. The note ends above the restaurant name (as shown in screenshots/note-text.jpg).
7. Also, capture the name of the restaurant. To do this, click the component with the restaurant name; it will show another page (as shown in screenshots/restaurant-info.jpg) with the full name of the restaurant under "商户详情".
8. Go back to the note page.
9. We don't need to capture the user comments at the bottom part of the page.
10. Put the text and pictures into a markdown file. We're done downloading one note. Go back to the home page.
11. Download the next note. We may need to scroll the screen after downloading some notes.
 
## Additional Requirements
	1. We won't download all the notes in one go. We may want to accept an argument when running the script for how many notes we are going to download this time.

### PNG to JPG Conversion Requirements
	- Use Android's BitmapFactory for reliable conversion on mobile devices.
	- Quality levels (90%)
	- Log conversion statistics including file size reduction and compression ratios.

### ImgBB Image Upload Requirements
	- Upload converted JPG images to ImgBB for external hosting.
	- Use API key authentication for secure uploads.
	- Implement retry mechanism (up to 3 attempts) for failed uploads.
	- Log upload success/failure status for each image.
	- Handle upload errors gracefully and continue processing.

### Dual Markdown Generation Requirements
	- Generate two versions of markdown files:
		1. **Internal Vault Version**: Uses relative image paths for local access
		2. **External Public Version**: Uses ImgBB URLs for public sharing
	- Internal markdown should be self-contained for offline access
	- External markdown should only be generated if all image uploads succeed
	- Both versions should have identical structure and content

### Directory Structure Requirements
	- Create organized directory structure:
		- `internal_vault/`: Contains internal markdown and images
		- `external_public/`: Contains external markdown files only
		- `images/`: Image files for internal vault
		- `metadata/`: Metadata and error logs
	- Ensure proper directory creation with fallback methods
	- Verify directory accessibility before file operations

### Metadata Management Requirements
	- Track downloaded notes with comprehensive metadata
	- Save note information including: title, timestamp, view count, restaurant name
	- Track image files with original and new names, local paths, and ImgBB URLs
	- Log upload errors for manual review
	- Implement resume functionality to avoid duplicate downloads

### Session Management Requirements
	- Track session duration and note processing limits
	- Implement auto-resume functionality for interrupted sessions
	- Handle content growth detection during download sessions
	- Log session statistics and progress information

### Note Positioning Requirements
	- Verify note element position before clicking to ensure reliable interaction
	- Check visibility requirements (minimum 70% of element must be visible)
	- Maintain safe margins from screen edges (minimum 100px)
	- Implement automatic position adjustment with smooth scrolling
	- Support different screen sizes and orientations
	- Provide detailed logging of positioning status and adjustments
	- Handle edge cases like partially visible or off-screen elements
	- Include fallback mechanism to proceed even if positioning fails

### ✅ Working Implementation Status
**Note Positioning & Tracking System** - **COMPLETED AND WORKING**

**Key Features Implemented**:
- **Swipe Parameter Optimization**: Fixed screen movement by using proven swipe patterns (80% screen height, 500ms duration)
- **Title-Based Note Tracking**: Captures note title before positioning to ensure reliable rediscovery after scrolling
- **Multi-Strategy Rediscovery**: Finds target note using title → index → first element fallback approach
- **Comprehensive Logging**: Detailed tracking of positioning attempts and element rediscovery
- **Misoperation Prevention**: Ensures correct note is clicked after positioning adjustments

**Implementation Details**:
- Enhanced `clickNoteByIndexWithPositioning()` with note title capture
- Updated `adjustNotePosition()` with optimized swipe parameters
- Added `findTargetNoteByTitleOrIndex()` for smart note rediscovery
- Added `findNoteAfterPositioning()` to relocate target after scrolling
- Robust error handling and fallback mechanisms

**Test Results**: ✅ All positioning and tracking functionality working correctly as verified by user testing