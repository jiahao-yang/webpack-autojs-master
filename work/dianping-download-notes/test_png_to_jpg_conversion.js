/**
 * Test Script: PNG to JPG Conversion
 * 测试脚本：PNG转JPG转换
 * 
 * Tests the PNG to JPG conversion functionality before implementing in main downloader
 * 在实现到主下载器之前测试PNG到JPG转换功能
 */

// Test configuration
const TEST_CONFIG = {
    sourceImagePath: "/storage/emulated/0/Download/dianping_notes/internal_vault/images/note_20250805_1754393705541_image_004.png",
    testOutputDir: "/storage/emulated/0/Download/dianping_notes/test_conversion/",
    qualityLevels: [80, 85, 90, 95], // Test different quality settings
    logPrefix: "🧪 [TEST]"
};

/**
 * Logs test messages with prefix
 * 使用前缀记录测试消息
 */
function testLog(message) {
    console.log(`${TEST_CONFIG.logPrefix} ${message}`);
    toastLog(`${TEST_CONFIG.logPrefix} ${message}`);
}

/**
 * Converts PNG image to JPG with quality preservation
 * 将PNG图片转换为JPG，保持图片质量
 * 
 * @param {string} sourcePath - Source PNG file path
 * @param {string} destPath - Destination JPG file path
 * @param {number} quality - JPG quality (0-100, default 90)
 * @returns {Object} - Conversion result with success status and file info
 */
function convertPngToJpg(sourcePath, destPath, quality = 90) {
    const result = {
        success: false,
        sourceSize: 0,
        destSize: 0,
        compressionRatio: 0,
        error: null
    };
    
    try {
        testLog(`🔄 Starting conversion: ${sourcePath} → ${destPath} (quality: ${quality}%)`);
        
        // Check if source file exists
        if (!files.exists(sourcePath)) {
            result.error = `Source file does not exist: ${sourcePath}`;
            testLog(`❌ ${result.error}`);
            return result;
        }
        
        // Get source file size (use Java File API for compatibility)
        result.sourceSize = new java.io.File(sourcePath).length();
        testLog(`📊 Source file size: ${(result.sourceSize / 1024).toFixed(2)} KB`);
        
        // Use Android's BitmapFactory for conversion
        const bitmap = android.graphics.BitmapFactory.decodeFile(sourcePath);
        if (!bitmap) {
            result.error = `Failed to decode PNG: ${sourcePath}`;
            testLog(`❌ ${result.error}`);
            return result;
        }
        
        testLog(`✅ Successfully decoded PNG (${bitmap.getWidth()}x${bitmap.getHeight()})`);
        
        // Ensure destination directory exists (use Java File API for parent path)
        const destDir = new java.io.File(destPath).getParent();
        if (!files.exists(destDir)) {
            files.ensureDir(destDir);
            testLog(`📁 Created destination directory: ${destDir}`);
        }
        
        // Create output stream for JPG
        const outputStream = new java.io.FileOutputStream(destPath);
        const success = bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, quality, outputStream);
        outputStream.close();
        bitmap.recycle();
        
        if (success) {
            // Get destination file size (use Java File API for compatibility)
            if (files.exists(destPath)) {
                result.destSize = new java.io.File(destPath).length();
                result.compressionRatio = ((result.sourceSize - result.destSize) / result.sourceSize * 100).toFixed(2);
                result.success = true;
                
                testLog(`✅ Conversion successful!`);
                testLog(`📊 Destination file size: ${(result.destSize / 1024).toFixed(2)} KB`);
                testLog(`📊 Compression ratio: ${result.compressionRatio}%`);
                testLog(`📊 File size reduction: ${(result.sourceSize - result.destSize) / 1024} KB`);
            } else {
                result.error = "Destination file was not created";
                testLog(`❌ ${result.error}`);
            }
        } else {
            result.error = "Failed to compress to JPG";
            testLog(`❌ ${result.error}`);
        }
        
    } catch (error) {
        result.error = `Error during conversion: ${error.message}`;
        testLog(`❌ ${result.error}`);
    }
    
    return result;
}

/**
 * Tests conversion with different quality settings
 * 使用不同质量设置测试转换
 */
function testQualityLevels() {
    testLog("🚀 Starting quality level tests...");
    
    const results = [];
    
    for (const quality of TEST_CONFIG.qualityLevels) {
        const destPath = files.join(TEST_CONFIG.testOutputDir, `test_quality_${quality}.jpg`);
        
        testLog(`\n📋 Testing quality level: ${quality}%`);
        const result = convertPngToJpg(TEST_CONFIG.sourceImagePath, destPath, quality);
        result.quality = quality;
        result.destPath = destPath;
        results.push(result);
        
        // Add delay between tests
        sleep(1000);
    }
    
    return results;
}

/**
 * Tests basic conversion functionality
 * 测试基本转换功能
 */
function testBasicConversion() {
    testLog("🚀 Starting basic conversion test...");
    
    const destPath = files.join(TEST_CONFIG.testOutputDir, "test_basic_conversion.jpg");
    const result = convertPngToJpg(TEST_CONFIG.sourceImagePath, destPath, 90);
    
    return result;
}

/**
 * Displays test results summary
 * 显示测试结果摘要
 */
function displayTestResults(results) {
    testLog("\n📊 ===== TEST RESULTS SUMMARY =====");
    
    if (Array.isArray(results)) {
        // Multiple quality tests
        testLog(`📋 Tested ${results.length} quality levels:`);
        results.forEach(result => {
            if (result.success) {
                testLog(`✅ Quality ${result.quality}%: ${(result.destSize / 1024).toFixed(2)} KB (${result.compressionRatio}% reduction)`);
            } else {
                testLog(`❌ Quality ${result.quality}%: ${result.error}`);
            }
        });
        
        // Find best quality/size ratio
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length > 0) {
            const bestResult = successfulResults.reduce((best, current) => {
                // Prefer higher quality with good compression
                const currentScore = current.quality * (current.compressionRatio / 100);
                const bestScore = best.quality * (best.compressionRatio / 100);
                return currentScore > bestScore ? current : best;
            });
            
            testLog(`\n🏆 Recommended quality: ${bestResult.quality}%`);
            testLog(`   - File size: ${(bestResult.destSize / 1024).toFixed(2)} KB`);
            testLog(`   - Compression: ${bestResult.compressionRatio}%`);
        }
    } else {
        // Single test
        if (results.success) {
            testLog(`✅ Basic conversion successful!`);
            testLog(`📊 Quality: 90%`);
            testLog(`📊 File size: ${(results.destSize / 1024).toFixed(2)} KB`);
            testLog(`📊 Compression: ${results.compressionRatio}%`);
        } else {
            testLog(`❌ Basic conversion failed: ${results.error}`);
        }
    }
    
    testLog("📊 ===== END TEST RESULTS =====");
}

/**
 * Main test function
 * 主测试函数
 */
function main() {
    testLog("🧪 Starting PNG to JPG conversion test...");
    
    // Check if source file exists
    if (!files.exists(TEST_CONFIG.sourceImagePath)) {
        testLog(`❌ Test source file not found: ${TEST_CONFIG.sourceImagePath}`);
        testLog("Please ensure the test image exists before running this script.");
        return;
    }
    
    // Create test output directory
    if (!files.exists(TEST_CONFIG.testOutputDir)) {
        files.ensureDir(TEST_CONFIG.testOutputDir);
        testLog(`📁 Created test output directory: ${TEST_CONFIG.testOutputDir}`);
    }
    
    testLog(`📁 Source file: ${TEST_CONFIG.sourceImagePath}`);
    testLog(`📁 Test output directory: ${TEST_CONFIG.testOutputDir}`);
    
    // Run basic conversion test
    const basicResult = testBasicConversion();
    
    // Run quality level tests
    const qualityResults = testQualityLevels();
    
    // Display results
    displayTestResults(qualityResults);
    
    testLog("✅ Test completed! Check the test output directory for converted files.");
    testLog(`📁 Test files location: ${TEST_CONFIG.testOutputDir}`);
}

// Run the test
main(); 