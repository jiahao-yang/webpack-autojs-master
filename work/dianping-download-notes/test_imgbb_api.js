/**
 * ImgBB API Test for Image Upload
 * ImgBB API 图片上传测试
 * 
 * Tests ImgBB API which is simpler and more compatible
 * 测试ImgBB API，更简单且更兼容
 */

// ImgBB API configuration
const IMGBB_CONFIG = {
    apiKey: "b4c48cb837bf0fb4217ccac1cd27f59f",
    uploadUrl: "https://api.imgbb.com/1/upload",
    testImagePath: "/storage/emulated/0/Download/dianping_notes/images/note_001_image_001.png"
};

/**
 * Test ImgBB API upload
 * 测试ImgBB API上传
 */
function testImgBBUpload() {
    try {
        toastLog("🚀 开始ImgBB API测试");
        toastLog("=" * 50);
        
        // Check if test image exists
        if (!files.exists(IMGBB_CONFIG.testImagePath)) {
            toastLog("❌ 测试图片不存在");
            return;
        }
        
        toastLog("📁 图片路径: " + IMGBB_CONFIG.testImagePath);
        toastLog("🔗 API 端点: " + IMGBB_CONFIG.uploadUrl);
        toastLog("🔑 API 密钥: " + IMGBB_CONFIG.apiKey.substring(0, 8) + "...");
        
        // Read image data
        let imageBytes;
        try {
            imageBytes = files.readBytes(IMGBB_CONFIG.testImagePath);
            toastLog("📁 图片读取成功，大小：" + imageBytes.length + " 字节");
        } catch (e) {
            toastLog("❌ 读取图片失败：" + e.message);
            return;
        }
        
        // Test different ImgBB upload methods
        testImgBBMethod1(imageBytes);
        testImgBBMethod2(imageBytes);
        testImgBBMethod3();
        
    } catch (error) {
        toastLog("❌ 测试异常：" + error.message);
    }
}

/**
 * Method 1: Send image as base64 data
 * 方法1: 发送base64编码的图片数据
 */
function testImgBBMethod1(imageBytes) {
    toastLog("🔄 方法1: 发送base64编码数据...");
    try {
        // Convert to base64
        const base64Data = android.util.Base64.encodeToString(imageBytes, android.util.Base64.DEFAULT);
        
        const response = http.post(IMGBB_CONFIG.uploadUrl, {
            key: IMGBB_CONFIG.apiKey,
            image: base64Data
        });
        
        toastLog("📡 响应状态码: " + response.statusCode);
        toastLog("📄 响应内容: " + response.body.string());
        
        if (response.statusCode === 200) {
            try {
                const result = JSON.parse(response.body.string());
                if (result.success && result.data && result.data.url) {
                    toastLog("✅ 方法1上传成功！");
                    toastLog("🔗 图片链接: " + result.data.url);
                    toastLog("📝 Markdown格式: ![image](" + result.data.url + ")");
                    return result.data.url;
                } else {
                    toastLog("❌ 方法1上传失败：" + (result.error ? result.error.message : "未知错误"));
                }
            } catch (e) {
                toastLog("❌ 方法1解析响应失败：" + e.message);
            }
        } else {
            toastLog("❌ 方法1HTTP错误: " + response.statusCode);
        }
    } catch (error) {
        toastLog("❌ 方法1异常: " + error.message);
    }
}

/**
 * Method 2: Send image as file upload
 * 方法2: 发送文件上传
 */
function testImgBBMethod2(imageBytes) {
    toastLog("🔄 方法2: 发送文件上传...");
    try {
        const response = http.post(IMGBB_CONFIG.uploadUrl, {
            key: IMGBB_CONFIG.apiKey,
            image: IMGBB_CONFIG.testImagePath
        });
        
        toastLog("📡 响应状态码: " + response.statusCode);
        toastLog("📄 响应内容: " + response.body.string());
        
        if (response.statusCode === 200) {
            try {
                const result = JSON.parse(response.body.string());
                if (result.success && result.data && result.data.url) {
                    toastLog("✅ 方法2上传成功！");
                    toastLog("🔗 图片链接: " + result.data.url);
                    toastLog("📝 Markdown格式: ![image](" + result.data.url + ")");
                    return result.data.url;
                } else {
                    toastLog("❌ 方法2上传失败：" + (result.error ? result.error.message : "未知错误"));
                }
            } catch (e) {
                toastLog("❌ 方法2解析响应失败：" + e.message);
            }
        } else {
            toastLog("❌ 方法2HTTP错误: " + response.statusCode);
        }
    } catch (error) {
        toastLog("❌ 方法2异常: " + error.message);
    }
}

/**
 * Method 3: Send image as raw bytes
 * 方法3: 发送原始字节
 */
function testImgBBMethod3() {
    toastLog("🔄 方法3: 发送原始字节...");
    try {
        const response = http.post(IMGBB_CONFIG.uploadUrl, {
            key: IMGBB_CONFIG.apiKey,
            image: files.readBytes(IMGBB_CONFIG.testImagePath)
        });
        
        toastLog("📡 响应状态码: " + response.statusCode);
        toastLog("📄 响应内容: " + response.body.string());
        
        if (response.statusCode === 200) {
            try {
                const result = JSON.parse(response.body.string());
                if (result.success && result.data && result.data.url) {
                    toastLog("✅ 方法3上传成功！");
                    toastLog("🔗 图片链接: " + result.data.url);
                    toastLog("📝 Markdown格式: ![image](" + result.data.url + ")");
                    return result.data.url;
                } else {
                    toastLog("❌ 方法3上传失败：" + (result.error ? result.error.message : "未知错误"));
                }
            } catch (e) {
                toastLog("❌ 方法3解析响应失败：" + e.message);
            }
        } else {
            toastLog("❌ 方法3HTTP错误: " + response.statusCode);
        }
    } catch (error) {
        toastLog("❌ 方法3异常: " + error.message);
    }
}

// Run the test
testImgBBUpload(); 