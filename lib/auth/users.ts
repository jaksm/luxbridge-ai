import { User } from "../types/user";

export const users: Record<string, User> = {
  "jaksa.malisic@gmail.com": {
    userId: "demo_user",
    email: "jaksa.malisic@gmail.com",
    password: "demo123",
    name: "Demo User",
    scenario: "empty_portfolio",
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: []
    }
  }
};
