

export function LoadingScreen() {
    return (
        <div className="loading-screen">
            <img src="/sofi-logo.png" alt="SoFi" className="loading-logo" />
            <div className="loading-bar-container">
                <div className="loading-bar" />
            </div>
            <p className="loading-text">Loading</p>
        </div>
    );
}
