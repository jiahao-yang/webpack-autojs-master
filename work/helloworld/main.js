
// This script is using autox.js to print "hello world" on the connected device.



/**
 * Main function to print "hello world" on the connected device.
 * Calls the `toastLog` function in autox.js
 */
function main() {
    // Attempt to call the toastLog function to display the message, catching any errors that may occur.
    try {
        toastLog("hello world: 一切都非常Okay");

        // sleep for 1 second
        sleep(1000);

        // Launch the "大众点评" app
        app.launchApp("大众点评");

        sleep(3000);
        
        // Display and log current package
        toastLog("current package: " + currentPackage());

        // Display and log clipboard content
        // toastLog("剪贴板内容为:" + getClip());

        // Click the "我的" button
        id("title").className("android.widget.TextView").text("我的").findOne().parent().click();

    } catch (error) {
        // Handle the error here, such as logging it to the console or a log system.
        // The specific approach depends on the application environment and requirements.
        console.error("Failed to show toast log: ", error);
    }
}

main()