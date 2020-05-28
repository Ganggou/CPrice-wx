const app = getApp()
const qiniuUploader = require("../../utils/qiniuUploader")
const util = require('../../utils/util.js')

Page({
  data: {
    keyword: '',
    goods: {},
    selectedGoodId: "",
    taskValue: null,
    showModalStatus: false,
    tmpIds: [],
    platforms: {},
    tasks: {},
  },
  onLoad: function () {
    this.fetchTemplateids()
  },
  onShow: function () {
    this.fetchPlatforms()
  },
  fetchPlatforms: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'platforms',
      method: 'GET',
      success: function (res) {
        if (res.data.ok) {
          that.setData({
            platforms: res.data.data
          })
        }
      }
    })
  },
  fetchTemplateids: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'fetchTemplateIds',
      method: 'GET',
      success: function (res) {
        if (res.data.ok) {
          that.setData({ tmpIds: res.data.ids })
        }
      }
    })
  },
  onKeywordChange: function (e) {
    this.setData({
      keyword: e.detail.value
    })
  },
  search: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'goods/search',
      method: 'GET',
      data: {
        key: that.data.keyword
      },
      success: function (res) {
        if (res.data.ok) {
          var tmp = {}
          var goods = res.data.data
          for (var i = 0; i < goods.length; i++) {
            goods[i].updated_at = util.formatTime(new Date(goods[i].updated_at))
            goods[i].price /= 100.0
            tmp[goods[i].id] = goods[i]
          }
          that.setData({
            goods: tmp
          })
          that.fetchTasks()
        } 
      }
    })
  },
  subModal: function (e) {
    var that = this
    var goodId = e.currentTarget.dataset.id
    this.setData({
      selectedGoodId: goodId,
      taskValue: that.data.tasks[goodId] ? that.data.tasks[goodId].match_value : null
    })
    this.powerDrawer(e.currentTarget.dataset.statu)
  },
  onTaskInputChange: function (e) {
    this.setData({
      taskValue: e.detail.value
    })
  },
  cancel: function () {
    this.powerDrawer('close')
  },
  unsub: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'tasks/sleep',
      method: 'POST',
      data: {
        id: that.data.selectedGoodId
      },
      header: {
        'content-type': 'application/json', // 默认值
        'Authorization': wx.getStorageSync('jwt')
      },
      success: function (res) {
        if (res.data.ok) {
          that.powerDrawer('close')
          that.reloadTasks(res.data.data)
        } else {
          wx.showToast({
            icon: 'none',
            duration: 1200,
            title: res.data.message
          })
        }
      }
    })
  },
  sub: function () {
    var that = this
    wx.requestSubscribeMessage({
      tmplIds: that.data.tmpIds,
      success(res) {
        for (var i = 0; i < that.data.tmpIds.length; i++) {
          if (res[that.data.tmpIds[i]] !== "accept") {
            return
          }
        }
        that.createTask()
      }
    })
  },
  copy: function (e) {
    var that = this
    wx.setClipboardData({
      data: that.data.platforms[e.currentTarget.dataset.platform].url + e.currentTarget.dataset.id,
      success: function (res) {
        console.info(res)
      }
    })
  },
  createTask: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'tasks',
      method: 'POST',
      data: {
        good_id: that.data.selectedGoodId,
        match_value: that.data.taskValue * 100
      },
      header: {
        'content-type': 'application/json', // 默认值
        'Authorization': wx.getStorageSync('jwt')
      },
      success: function (res) {
        if (res.data.ok) {
          that.powerDrawer('close')
          that.reloadTasks(res.data.data)
        }
        wx.showToast({
          icon: 'none',
          duration: 1200,
          title: res.data.message
        })
      }
    })
  },
  powerDrawer: function (status) {
    var currentStatu = status;
    this.util(currentStatu)
  },
  util: function (currentStatu) {
    /* 动画部分 */
    // 第1步：创建动画实例 
    var animation = wx.createAnimation({
      duration: 200,  //动画时长
      timingFunction: "linear", //线性
      delay: 0  //0则不延迟
    });

    // 第2步：这个动画实例赋给当前的动画实例
    this.animation = animation;

    // 第3步：执行第一组动画
    animation.opacity(0).rotateX(-100).step();

    // 第4步：导出动画对象赋给数据对象储存
    this.setData({
      animationData: animation.export()
    })

    // 第5步：设置定时器到指定时候后，执行第二组动画
    setTimeout(function () {
      // 执行第二组动画
      animation.opacity(1).rotateX(0).step();
      // 给数据对象储存的第一组动画，更替为执行完第二组动画的动画对象
      this.setData({
        animationData: animation
      })

      //关闭
      if (currentStatu == "close") {
        this.setData(
          {
            showModalStatus: false
          }
        );
      }
    }.bind(this), 200)

    // 显示
    if (currentStatu == "open") {
      this.setData(
        {
          showModalStatus: true
        }
      );
    }
  },
  showGood: function (e) {
    wx.navigateTo({
      url: '../good/good?id=' + e.currentTarget.dataset.id
    })
  },
  fetchTasks: function () {
    var that = this
    wx.request({
      url: app.globalData.rootUrl + 'tasks',
      method: 'GET',
      header: {
        'content-type': 'application/json', // 默认值
        'Authorization': wx.getStorageSync('jwt')
      },
      success: function (res) {
        if (res.data.ok) {
          that.reloadTasks(res.data.data)
        }
      }
    })
  },
  reloadTasks: function (tasks) {
    var tmp = {}
    var goods = this.data.goods
    for (var i = 0; i < tasks.length; i++) {
      tasks[i].match_value /= 100.0
      tmp[tasks[i].good_id] = tasks[i]
      if (goods.hasOwnProperty(tasks[i].good_id)) {
        goods[tasks[i].good_id]['state'] = tasks[i].state
      }
    }
    this.setData({
      tasks: tmp,
      goods: goods
    })
  },
})