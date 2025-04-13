import './App.css';
import Cart from "./Components/cart";
import Header from "./Components/Header";
import OpenLink from "./Components/OpenLink/OpenLink";
import { BrowserRouter, Routes, Route } from "react-router-dom";


function App() {
    return (
        <>
            <BrowserRouter>
                <Header/>
                <Routes>
                    <Route path='/' element={<Cart />} />
                    <Route path='/open/:id' element={<OpenLink />} />
                </Routes>
            </BrowserRouter>


        </>
    );
}

export default App;
