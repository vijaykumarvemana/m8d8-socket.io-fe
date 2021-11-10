import { Container, Row, Col, Button, ListGroup, Form, FormControl } from 'react-bootstrap'
import React, { FormEvent, useState, useEffect, FormEventHandler } from 'react'
import { io } from 'socket.io-client'
import User from '../interfaces/User'
import Message from '../interfaces/Message'
import { Room } from '../interfaces/Room'

// 1) REFRESHING THE PAGE CONNECTS MY CLIENT TO THE SERVER
// 2) IF THE CONNECTION ESTABLISHES CORRECTLY, THE SERVER WILL SEND ME A 'CONNECT' EVENT
// 3) WHEN WE ARE CORRECTLY CONNECTED, WE CAN SEND OUR USERNAME EMITTING AN EVENT OF TYPE 'SETUSERNAME'
// 4) IF THE USERNAME IS RECEIVED FROM THE BACKEND, THE CLIENT WILL RECEIVE A 'LOGGEDIN' EVENT
// 5) WHEN WE RECEIVE A LOGGEDIN EVENT, WE UNLOCK THE MESSAGE INPUT FIELD AND RETRIEVE THE OTHER USERS
// 6) TO MAKE THE OTHER CONNECTED CLIENTS AWARE OF THE NEW CONNECTED USER, WE SET UP AN EVENT LISTENER FOR 'NEWCONNECTION'
// 7) THE 'NEWCONNECTION' EVENT SHOULD BE LISTENABLE JUST IF A USER HAS ALREADY LOGGED IN

const ADDRESS = 'http://localhost:3030'
const socket = io(ADDRESS, { transports: ['websocket'] })
// I'm saving the return value of io in order to interact with the established socket

const Home = () => {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [chatHistory, setChatHistory] = useState<Message[]>([])

  // every time we refresh the page, we're establishing the connection
  // the server sends us back a 'connect' event
  // the first step is to set up an EVENT LISTENER for this 'connect' event

  useEffect(() => {
    // here, in an useEffect just happening once, we're going to set our event listeners
    // let's set up our first event listener, for the 'connect' event
    socket.on('connect', () => {
      // every .on is an event listener
      console.log('Connection established!')
    })

    // socket.on("message-error", ({ error }) => {
    //   console.log(error)
    //   alert(error)
    // })

    socket.on('loggedin', () => {
      console.log('The client now is logged in!')
      // now I'm able to send/receive messages
      // now I can disable the username input field, and I can enable the message input field
      setLoggedIn(!loggedIn)
      fetchOnlineUsers()
      socket.on('newConnection', () => {
        // this event is not getting dispatched to the user that logs in,
        // but to ALL the OTHER connected clients
        // it means literally "watch out, someone else just connected!"
        // now the other "old" clients need to fetch the user list
        console.log('new user connected!')
        fetchOnlineUsers()
      })
    })

    socket.on('message', (newMessage) => {
      // this is for all the other connected clients, to receive the message sent by the sender
      // setChatHistory([...chatHistory, newMessage])
      // this is not working :( chatHistory is ALWAYS an empty array []
      // because chatHistory in my useEffect(() => {},[]) is evalueated just ONCE when the application starts
      // and when the chatHistory in just an empty array
      setChatHistory((updatedChatHistory) => [...updatedChatHistory, newMessage])
      // this instead will work, because I'm reading and evaluating the content of chatHistory
      // every time I need to set the new value for it
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchOnlineUsers = async () => {
    try {
      let response = await fetch(ADDRESS + '/online-users')
      if (response.ok) {
        //   let { onlineUsers }: { onlineUsers: User[] } = await response.json()
        let data = await response.json()
        console.log(data)
        let onlineUsers: User[] = data.onlineUsers
        setOnlineUsers(onlineUsers)
      } else {
        console.log('Something went wrong fetching the online users :(')
      }
    } catch (error) {
      console.log(error)
    }
  }

  const handleUsernameSubmit = async (e: FormEvent) => {
    e.preventDefault()
    // console.log(e)
    // what we want to do now is sending our username to the server
    socket.emit('setUsername', {
      // I want to carry my username with this event
      // the second parameter of .emit is a payload of data
      // it's not mandatory
      username: username,
      room: room
    })

    const res = await fetch(ADDRESS + '/chat/' + room)
    const oldHistory = await res.json()

    setChatHistory(oldHistory)

  }

  const handleMessageSubmit = (e: FormEvent) => {
    e.preventDefault()
    // console.log(e)

    const newMessage: Message = {
      text: message,
      sender: username,
      timestamp: Date.now(),
      id: socket.id,
    }

    socket.emit('sendmessage', { message: newMessage, room })

    // a useState setter function can work in two ways
    setChatHistory([...chatHistory, newMessage])
    setMessage('')
  }

  const [room, setRoom] = useState<Room>("blue")

  const toggleRoom = () => {
    setRoom(r => r === "blue" ? "red" : "blue")
  }

  // const [room, setRoom] = useState("main")

  // const handleRoomInput = (e: any) => {
  //   console.log(e)
  //   const { value } = e.target as HTMLInputElement
  //   setRoom(value)
  // }

  console.log(room)

  return (
    <Container fluid className="px-4">
      <Row className="my-3" style={{ height: '95vh' }}>
        <Col md={10} className="d-flex flex-column justify-content-between">
          {/* MAIN MESSAGES AREA */}
          {/* TOP SECTION: USERNAME FIELD */}
          <Form onSubmit={handleUsernameSubmit} className="d-flex">
            <FormControl
              placeholder="Insert your username here"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loggedIn}
            />
            {/* <FormControl type="text" onChange={handleRoomInput} value={room} /> */}
            {/* <button type="submit" className="btn btn-primary ml-2"> submit </button> */}
            <Button onClick={toggleRoom} variant={room === "blue" ? "primary" : "danger"} className="ml-2">Room</Button>
          </Form>
          {/* MIDDLE SECTION: CHAT HISTORY */}
          <ListGroup>
            {chatHistory.map((message, i) => (
              <ListGroup.Item key={i}>
                <strong>{message.sender}</strong>
                <span className="mx-1"> | </span>
                <span>{message.text}</span>
                <span className="ml-2" style={{ fontSize: '0.7rem' }}>
                  {new Date(message.timestamp).toLocaleTimeString('en-US')}
                </span>
              </ListGroup.Item>
            ))}
          </ListGroup>
          {/* BOTTOM SECTION: NEW MESSAGE INPUT FIELD */}
          <Form onSubmit={handleMessageSubmit}>
            <FormControl
              placeholder="Send a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={!loggedIn}
            />
          </Form>
        </Col>
        <Col md={2} style={{ borderLeft: '2px solid black' }}>
          {/* CONNECTED USERS AREA */}
          <div className="my-3">Connected users:</div>
          <ListGroup>
            {onlineUsers
              .filter(u => u.room === room)
              .map((user) => (
                <ListGroup.Item key={user.id}>{user.username}</ListGroup.Item>
              ))}
          </ListGroup>
        </Col>
      </Row>
    </Container>
  )
}

export default Home
