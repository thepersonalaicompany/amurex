import React from "react";
// import { HashRouter as Router, Routes, Route } from "react-router-dom";

import Sidepanel from "./sidepanel";
import ChatSidepanel from "./chatsidepanel";

const App = () => {
  const [route, setRoute] = React.useState("/");
  const [meetingId, setMeetingId] = React.useState(null);

  console.log("route", route);

  return (
    <>
      {route === "/" && (
        <Sidepanel setRoute={setRoute} setMeetingId={setMeetingId} />
      )}
      {route === "/chat" && (
        <ChatSidepanel setRoute={setRoute} meetingId={meetingId} />
      )}
    </>
    // <Router>
    //   <Routes>
    //     <Route path='/' element={<Sidepanel />} />
    //     <Route path='/chat' element={<ChatSidepanel />} />
    //   </Routes>
    // </Router>
  );
};

export default App;
