import { useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import '../cart.css'
import Loader from "../Loading/Loading";

const OpenLink = () => {
    const { id } = useParams();
    const [status, setStatus] = useState("checking");
    const [fileList, setFileList] = useState([]);

    const [expiresAt, setExpiresAt] = useState(null);
    const [remainingTime, setRemainingTime] = useState(0);

    useEffect(() => {
        fetch(`http://localhost:5000/api/files/check/${id}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.valid) {
                    setStatus("valid");
                    setFileList(data.file.originalNames);
                    const expTime = new Date(data.file.expiresAt).getTime();
                    setExpiresAt(expTime);
                } else {
                    setStatus(data.message === "Link expired" ? "expired" : "notfound");
                }
            })
            .catch(() => setStatus("error"));
    }, [id]);

    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setStatus("expired");
                clearInterval(interval);
            } else {
                setRemainingTime(Math.floor(diff / 1000)); // у секундах
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);



    if (status === "checking") {
        return (
            <div className="container">

                    <Loader />

            </div>
        );
    }

    if (status === "notfound") {
        return (
            <div className="container">

                    <h1 className="title">File not found</h1>

            </div>
        );
    }

    if (status === "expired") {
        return (
            <div className="container">
                <div className="form_area">
                    <h1 className="title">Link expired</h1>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="container">
                <div className="form_area">
                    <p className="title">Server error</p>
                </div>
            </div>
        );
    }


    return (

        <div className="container">
            <div className="form_area">
                <p className="title">Files ready to download</p>

                <p className="title">
                    ⏳ Time left: {
                    remainingTime >= 3600
                        ? `${Math.floor(remainingTime / 3600)}h`
                        : remainingTime >= 60
                            ? `${Math.floor(remainingTime / 60)}m`
                            : `${remainingTime}s`
                }
                </p>

                <form action="">
                    <div className="form_group">
                        <ul className="file-list">
                            {fileList.map((name, index) => (
                                <li key={index}>
                                    <span className="file-name">📄 {name}</span>
                                    <a
                                        href={`http://localhost:5000/api/files/${id}?index=${index}`}
                                        className="btn"
                                    >
                                        Download
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OpenLink;
