// pages/merLogin/merLogin.js
const app = getApp()
Page({
  data: {
      email: '',
      password: '',
      tryTime: 0
  },
  formSubmit: function (e) {
    this.setData({
      tryTime: 3
    })
    this.tryLogin(e.detail.formId)
  },
  tryLogin: function (formId) {
    var that = this
    if (that.data.tryTime > 0) {
      wx.request({
        url: app.globalData.rootUrl + 'merchants/sign_in',
        method: 'POST',
        data: {
          'merchant': {
            "email": that.data.email,
            "password": that.data.password
          },
          wx_code: app.globalData.wx_code,
          form_id: formId
        },
        success: function (res) {
          if (res.data.ok) {
            wx.setStorageSync('jwt', res.header.Authorization)
            app.globalData.loginStatus = true
            app.globalData.self = res.data.self
            app.globalData.qiniuToken = res.data.qiniuToken
            app.globalData.qiniuHost = res.data.qiniuHost
            wx.setStorageSync('role', 'merchants')
            wx.switchTab({
              url: '/pages/index/index',
            })
          } else if (res.statusCode == 401){
            wx.showToast({
              title: '账号或密码不正确',
              icon: 'none',
              duration: 1200
            })
            return
          } else {
            that.setData({
              tryTime: that.data.tryTime - 1
            })
            wx.login({
              success: function (res) {
                app.globalData.wx_code = res.code
                that.tryLogin(formId)
              },
              fail: function (res) {
                that.tryLogin(formId)
              }
            })
          }
        }
      })
    }
  },
  getEmail: function (e) {
    this.setData({
      email: e.detail.value
    })
  },
  getPassword: function (e) {
    this.setData({
      password: e.detail.value
    })
  }
})
