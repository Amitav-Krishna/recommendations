import React from 'react';

interface Post {
  id: string;
  content: string;
  author: string;
}

interface PostListProps {
  posts: Post[];
  userId: string;
  onDelete: (postId: string) => void;
}

function PostList({ posts, userId, onDelete }: PostListProps) {
  const handleDelete = async (postId: string) => {
    try {
      const response = await fetch('/api', { // Removed /review prefix
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log('Post deleted:', result);
        onDelete(postId); // Update the UI after deletion
      } else {
        console.error('Failed to delete post:', result.error);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <p>{post.content}</p>
          {post.author === userId && (
            <button onClick={() => handleDelete(post.id)}>Delete</button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default PostList;
