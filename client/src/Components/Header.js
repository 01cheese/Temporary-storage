import "./Header.css";

function Header() {
    return (
        <header className="header">
            <div className="logo">
                <a href="https://vzbb.site"><span className="vz">VZ.</span>Drive</a>
            </div>
            <input type="checkbox" id="menu-toggle" className="menu-toggle" />
            <label htmlFor="menu-toggle" className="burger">&#9776;</label>
            <nav className="nav">
                <a href="http://localhost:3000">Main</a>
                <a href="#">About Project</a>
                <a href="#">GitHub</a>
            </nav>
        </header>
    );
}

export default Header;
