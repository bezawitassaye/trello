import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In real app: register user here
    navigate("/dashboard");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#111827] text-gray-200">
      <div className="bg-[#1f2937] p-8 rounded-2xl w-[400px] shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-6">Create Account</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 p-3 rounded-lg ring-2 ring-indigo-800 focus:ring-indigo-600 focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 py-2 rounded-lg hover:bg-indigo-500 transition"
          >
            Sign Up
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-400">
          Already have an account?{" "}
          <Link to="/" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
