import express from 'express'
const app = express()  


app.listen(7777,()=>{
	console.log('server is running on 7777')
})



//导入包
import { Server } from 'socket.io'

const io = new Server(3000,{
        cors: {
                //跨域
                origin: '*',
                //心跳包间隔（ms）
              //  pingInterval: 25000,
                //未响应等待时间（ms）
               // pingTimeout: 60000
        }
})



//创建在线用户实例容器
const userList = {}
//初始化在线用户数组
userList.userNameList = []
//创建离线消息暂存区
const offLineMessages = {}

//发送离线消息
const sendOffLineMessage = (toName)=>{
	userList[toName].emit('offLineMessage',offLineMessages[toName])
	delete offLineMessages[toName]
}


//监控离线消息存储情况(等待实现)


io.on('connection',(socket)=>{
	//登录监听
        socket.on('login',(data)=>{
		//用户名为空
                if (!data.name) return

		//如果重复连接则断开之前连接
		if(userList[data.name]){		
			userList[data.name].disconnect()
		}
		userList.userNameList.push(data.name)
		userList[data.name] = socket
		console.log(data.name + ' 已登录')
		console.log(userList.userNameList)

		//广播用户列表
		io.emit('updateUserList',userList.userNameList)

		//如果登录用户存在离线消息
		if(offLineMessages[data.name]){
			sendOffLineMessage(data.name,socket)
			console.log('离线消息已发送给 ',data.name)
		}
        })


	//消息监听
        socket.on('message',(data)=>{
                if(!data.name ||!data.message||!data.to || !userList[data.name]) return console.log('消息违法')
                //防止自己给自己发消息
                if(data.name === data.to) return

		//处理消息格式
		data.time = new Date(Date.now()+28800000)
		data.status = 0
		//解构赋值避免相同内存地址造成同步修改
		let dataTo = {...data}
		dataTo.to = 'my'
		let dataFrom = {...data}
		dataFrom.name = 'my'

                //接收人不在线则将消息缓存至offLineMessages
                if(!userList[data.to]) {
			if(!offLineMessages[data.to]) offLineMessages[data.to]={}
                	offLineMessages[data.to][data.name]?offLineMessages[data.to][data.name].push(dataTo):offLineMessages[data.to][data.name] = [dataTo]
			console.log('缓存了 '+data.name+' 发给 '+data.to+' 的离线消息')
			console.log(offLineMessages)
			userList[data.name].emit('message',dataFrom)

                 } else{
                //在线则从在线列表中调用相应socket对象的emit方法转发消息
                	userList[data.to].emit('message',dataTo)
			userList[data.name].emit('message',dataFrom)
		 }
        })


	//断开连接监听
        socket.on('disconnect',()=>{
                //调用Object的keys方法返回userList的所有键，并调用find方法遍历所有在线端对象返回断开连接的用户
                const disconnectUserName = Object.keys(userList).find(key => userList[key] === socket)
                delete userList[disconnectUserName]
		//利用indexOf方法遍历查找在线用户列表中断连用户的位置
		const disconnectUserKey = userList.userNameList.indexOf(disconnectUserName)
		console.log(disconnectUserKey,disconnectUserName)		
		userList.userNameList.splice(disconnectUserKey,1)
                console.log(disconnectUserName + ' 已断开连接',userList.userNameList)
		//广播用户列表
		io.emit('updateUserList',userList.userNameList)

        })
	

	//错误监听
        io.on('error',(error)=>{
                console.log(error)
        })
})



