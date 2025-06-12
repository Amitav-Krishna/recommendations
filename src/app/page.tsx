"use client";
import React, { useState, useEffect } from "react";
import styles from "../styles/App.module.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import * as Switch from "@radix-ui/react-switch";

interface Post {
    id: number;
    content: string;
    created_at: string;
    author: number;
    author_name?: string;
    author_email?: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    authenticated: boolean;
}

const App: React.FC = () => {
    // Debug state
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [showDebugLog, setShowDebugLog] = useState<boolean>(false);

    const addDebugLog = (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        const logEntry =
            `${timestamp}: ${message}` +
            (data ? ` - ${JSON.stringify(data)}` : "");
        setDebugLog((prev) => [...prev, logEntry]);
        console.log(logEntry);
    };
    const validateEmail = (email: string): boolean => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };
    // Konami code sequence
    const konamiCode = [
        "ArrowUp",
        "ArrowUp",
        "ArrowDown",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ArrowLeft",
        "ArrowRight",
        "b",
        "a",
    ];
    const [konamiIndex, setKonamiIndex] = useState<number>(0);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === konamiCode[konamiIndex]) {
                setKonamiIndex((prevIndex) => prevIndex + 1);
                if (konamiIndex + 1 === konamiCode.length) {
                    setShowDebugLog((prev) => !prev); // Toggle debug log visibility
                    setKonamiIndex(0); // Reset the sequence
                }
            } else {
                setKonamiIndex(0); // Reset if the sequence is broken
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [konamiIndex]);

    // State Management
    const [userInput, setUserInput] = useState<string>("");
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Authentication State
    const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
    const [signupModalOpen, setSignupModalOpen] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [name, setName] = useState<string>("");

    // Color inversion state
    const [invertColors, setInvertColors] = useState<boolean>(false);

    useEffect(() => {
        if (invertColors) {
            document.body.classList.add("inverted");
        } else {
            document.body.classList.remove("inverted");
        }
        return () => document.body.classList.remove("inverted");
    }, [invertColors]);
    // User persistence
    const [user, setUser] = useState<User | null>(null);
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedUser = localStorage.getItem("user");
            if (savedUser) {
                try {
                    const userData = JSON.parse(savedUser);
                    setUser({
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        authenticated: true,
                    });
                    addDebugLog("Loaded user from localStorage", userData);
                } catch (e) {
                    addDebugLog("Failed to parse user data from localStorage");
                }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (user) {
                localStorage.setItem("user", JSON.stringify(user));
            } else {
                localStorage.removeItem("user");
            }
        }
    }, [user]);

    // Fetch Posts with author information
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                addDebugLog("Fetching posts from /review/api"); // Updated log message
                const response = await fetch("/review/api"); // Explicitly include /review prefix

                if (!response.ok) {
                    const errorText = await response.text();
                    if (response.status === 502) {
                        throw new Error(
                            "The server is temporarily unavailable. Please try again later.",
                        );
                    }
                    throw new Error(
                        `HTTP error! status: ${response.status} - ${errorText}`,
                    );
                }

                const data = await response.json();
                addDebugLog(`Fetched ${data.length} posts with author info`);
                setPosts(data);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                addDebugLog("Error fetching posts", errorMessage);
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, []);

    const handleAction = async (): Promise<void> => {
        if (userInput.trim() === "") {
            addDebugLog("Post creation aborted: empty content");
            return;
        }

        if (!user?.id) {
            const errorMsg = "Cannot create post: Please login first";
            addDebugLog(errorMsg);
            setError(errorMsg);
            setLoginModalOpen(true);
            return;
        }

        addDebugLog(`Creating post as user ${user.id} (${user.name})`);
        try {
            const response = await fetch("/review/api", {
                // Explicitly include /review prefix
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    value: userInput,
                    userId: user.id,
                }),
            });

            addDebugLog(`POST response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 502) {
                    throw new Error(
                        "The server is temporarily unavailable. Please try again later.",
                    );
                }
                throw new Error(
                    `Server responded with ${response.status}: ${errorText}`,
                );
            }

            const newPost = await response.json();
            addDebugLog(`Created new post with ID: ${newPost.id}`);
            setPosts([newPost, ...posts]);
            setUserInput("");
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            addDebugLog(`Error creating post: ${errorMessage}`);
            setError(errorMessage);
        }
    };

    const handleDelete = async (postId: number) => {
        if (!user?.id) {
            const errorMsg = "Cannot delete post: Please login first";
            addDebugLog(errorMsg);
            setError(errorMsg);
            setLoginModalOpen(true);
            return;
        }

        addDebugLog(`Attempting to delete post ${postId} as user ${user.id}`);
        try {
            const response = await fetch("/review/api", {
                // Explicitly include /review prefix
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, userId: user.id }),
            });

            addDebugLog(`DELETE response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status === 502) {
                    throw new Error(
                        "The server is temporarily unavailable. Please try again later.",
                    );
                }
                throw new Error(
                    `Server responded with ${response.status}: ${errorText}`,
                );
            }

            addDebugLog(`Deleted post with ID: ${postId}`);
            setPosts(posts.filter((post) => post.id !== postId));
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            addDebugLog(`Error deleting post: ${errorMessage}`);
            setError(errorMessage);
        }
    };

    const handleLogin = async () => {
        addDebugLog("Attempting login");
        try {
            if (!validateEmail(email)) {
                const errorMsg = "Enter a valid email, you goober!";
                addDebugLog(errorMsg);
                setError(errorMsg);
                return;
            }
            const response = await fetch("/review/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            addDebugLog(`Login response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                addDebugLog("Unexpected response:", errorText);
                if (response.status === 502) {
                    throw new Error(
                        "The server is temporarily unavailable. Please try again later.",
                    );
                }
                if (response.status === 404) {
                    throw new Error("User not found");
                }
                throw new Error(
                    `Server responded with ${response.status}: ${errorText}`,
                );
            }

            const data = await response.json();
            addDebugLog("Full server response:", data);
            if (!data.id) {
                throw new Error("Server did not return id");
            }

            addDebugLog("Login successful, user data:", data);
            setUser({
                id: data.id,
                name: data.name,
                email: data.email,
                authenticated: true,
            });
            setLoginModalOpen(false);
            setEmail("");
            setPassword("");
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            if (errorMessage.includes("User not found")) {
                setError(
                    "You have either a\) forgotten to sign up, or b\) gotten your log in details incorrect. :>\)",
                );
            } else {
                setError(errorMessage);
            }
            addDebugLog(`Login error: ${errorMessage}`);
        }
    };

    const handleSignup = async () => {
        addDebugLog("Attempting signup");
        try {
            if (!validateEmail(email)) {
                const errorMsg = "Enter a valid email, you goober!";
                addDebugLog(errorMsg);
                setError(errorMsg);
                return;
            }
            const response = await fetch("/review/api/auth/signup", {
                // Explicitly include /review prefix
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            addDebugLog(`Signup response status: ${response.status}`);

            const data = await response.json();
            if (response.ok) {
                if (!data.id) {
                    throw new Error("Server did not return id after signup");
                }

                addDebugLog("Signup successful");
                setUser({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    authenticated: true,
                });
                setSignupModalOpen(false);
            } else {
                addDebugLog(`Signup failed: ${data.error}`);
                if (response.status === 502) {
                    throw new Error(
                        "The server is temporarily unavailable. Please try again later.",
                    );
                }
                setError(data.error);
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            addDebugLog(`Signup error: ${errorMessage}`);
            setError(errorMessage);
        }
    };

    const handleLogout = () => {
        addDebugLog("User logged out");
        setUser(null);
        setError(null);
        localStorage.removeItem("user");
    };

    if (isLoading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>The Krishna Collective</h1>
                <div className={styles.switchContainer}>
                    <label
                        className={styles.switchLabel}
                        htmlFor="color-invert-switch"
                    >
                        Invert Colors
                    </label>
                    <Switch.Root
                        id="color-invert-switch"
                        className={styles.switchRoot}
                        checked={invertColors}
                        onCheckedChange={setInvertColors}
                    >
                        <Switch.Thumb className={styles.switchThumb} />
                    </Switch.Root>
                </div>
                {user && (
                    <button
                        onClick={handleLogout}
                        className={styles.logoutButton}
                    >
                        Logout
                    </button>
                )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {process.env.NODE_ENV === "development" && showDebugLog && (
                <div className={styles.debugPanel}>
                    <h3>Debug Log</h3>
                    <button onClick={() => setDebugLog([])}>Clear Log</button>
                    <div className={styles.debugLog}>
                        {debugLog.map((log, index) => (
                            <div key={index} className={styles.debugLogEntry}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!user && (
                <div className={styles.authContainer}>
                    <button onClick={() => setLoginModalOpen(true)}>
                        Login
                    </button>
                    <button onClick={() => setSignupModalOpen(true)}>
                        Sign Up
                    </button>
                </div>
            )}

            {loginModalOpen && (
                <div className={styles.modal}>
                    <h2>Login</h2>
                    <input
                        type="email"
                        placeholder="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleLogin}>Login</button>
                    <button onClick={() => setLoginModalOpen(false)}>
                        Close
                    </button>
                </div>
            )}

            {signupModalOpen && (
                <div className={styles.modal}>
                    <h2>Sign Up</h2>
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleSignup}>Sign Up</button>
                    <button onClick={() => setSignupModalOpen(false)}>
                        Close
                    </button>
                </div>
            )}

            {user && (
                <div className={styles.inputContainer}>
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Write your post in Markdown..."
                    />
                    <button onClick={handleAction}>Submit Post</button>
                </div>
            )}

            <div className={styles.listContainer}>
                {posts.map((post) => (
                    <div key={post.id} className={styles.listItem}>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                                del: ({ node, ...props }) => <del {...props} />,
                                mark: ({ node, ...props }) => (
                                    <mark {...props} />
                                ),
                            }}
                        >
                            {post.content}
                        </ReactMarkdown>
                        <div className={styles.postMeta}>
                            <span className={styles.authorInfo}>
                                {post.author_name || "Unknown"} (
                                {post.author_email || "no email"})
                            </span>
                            <span
                                className={`${styles.postDate} ${
                                    user?.id === post.author
                                        ? styles.ownPostDate
                                        : ""
                                }`}
                                onClick={() => {
                                    if (user?.id === post.author) {
                                        const confirmDelete = window.confirm(
                                            "Are you sure you want to delete this post?",
                                        );
                                        if (confirmDelete) {
                                            handleDelete(post.id);
                                        }
                                    }
                                }}
                            >
                                {new Date(post.created_at).toLocaleString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
