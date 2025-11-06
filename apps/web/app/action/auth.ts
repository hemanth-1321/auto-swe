import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const auth = async (installationId: number) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/user/create`, {});
  } catch (error) {}
};
