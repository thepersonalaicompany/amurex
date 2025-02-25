import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Sidepanel from "./sidepanel";
import ChatSidepanel from "./chatsidepanel";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Sidepanel />} />
        <Route path='/chat' element={<ChatSidepanel />} />
      </Routes>
    </Router>
  );
};

export default App;
