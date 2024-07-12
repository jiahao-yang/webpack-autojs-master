const axios = require("axios");
var url = "https://www.yingcai.store/api/auth/login";
var username = "你的用户名";
var password = "你的密码";
axios(url, {
  method: "POST",
  data: {
    username,
    password,
  },
}).then((res) => {
  console.log(res);
});

// var res = http.postJson(url, {
//   name: username,
//   password: password,
// });
// console.log(JSON.stringify(res), "RES");
