"use client";
import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const getRepo = async () => {
  try {
    const TOKEN = localStorage.getItem("token");
    const response = await axios.get(`${BACKEND_URL}/get/repos`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    return response;
  } catch (error) {
    console.log("error fetching repos");
  }
};
