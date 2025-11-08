"use client";

import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const auth = async (installationId: number) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/user/create`, {
      installationId,
    });

    localStorage.setItem("token", response.data.token);
    console.log("token", response.data.token);
    return response.data.user;
  } catch (error: unknown) {
    console.error("Error authenticating user:");
    throw new Error("Failed to authenticate user");
  }
};

export const getUser = async () => {
  try {
    const TOKEN = localStorage.getItem("token");
    if (!TOKEN) throw new Error("No token found");

    const response = await axios.get(`${BACKEND_URL}/user/get/user`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    return response.data.user;
  } catch (err) {
    console.error("Failed to fetch user:", err);
    throw new Error("Failed to fetch user");
  }
};
