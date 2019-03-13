import { ApolloServer, gql } from "apollo-server";
import { GraphQLClient } from "graphql-request";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";

declare var process: {
  env: {
    ENDPOINT: string;
    HASURA_ACCESS_KEY: string;
    JWT_SECRET: string;
    NODE_ENV: string;
  };
};

const privateKey = fs.readFileSync("private.key");
const publicKey = fs.readFileSync("public.pem");

const graphql = new GraphQLClient(process.env.ENDPOINT, {
  headers: {
    "X-Hasura-Access-Key": process.env.HASURA_ACCESS_KEY
  }
});

const LOGIN = `
  query users($email: String, $username: String) {
    users(where: {
      _or: {
        email: {_eq: $email},
        username: {_eq: $username }
      }
    }) { id password }
  }
`;

const SIGNUP = `
  mutation signup($email: String, $password: String, $username: String) {
    insert_users(objects: [{ email: $email, password: $password, username: $username }]) { returning { id } }
  }
`;

const ME = `
  query me($id: Int) {
    users(where:{id: {_eq: $id}}) { id }
  }
`;

const typeDefs = gql`
  type Query {
    me: User!
  }
  type Mutation {
    signup(email: String, password: String, username: String): AuthPayload!
    login(email: String, password: String, username: String): AuthPayload!
  }
  type AuthPayload {
    token: String
  }
  type User {
    email: String
    id: Int
  }
`;

const resolvers = {
  Query: {
    me: async (_: any, _args: any, req: any) => {
      const Authorization = req.headers.authorization;
      if (Authorization) {
        const token = Authorization.replace("Bearer ", "");
        const verifiedToken = jwt.verify(token, publicKey, {
          algorithms: ["RS256"]
        });
        const user = await graphql
          // @ts-ignore
          .request(ME, { id: verifiedToken.userId })
          .then((data: any) => {
            return data.users[0];
          });
        return { ...user };
      } else {
        throw new Error("Not logged in.");
      }
    }
  },
  Mutation: {
    signup: async (
      _: any,
      data: { email: string; password: string; username: string }
    ) => {
      const { email, password, username } = data;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await graphql
        .request(SIGNUP, { email, password: hashedPassword, username })
        .then((data: any) => {
          return data.insert_users.returning[0];
        });

      const token = jwt.sign(
        {
          userId: user.id,
          "https://hasura.io/jwt/claims": {
            "x-hasura-allowed-roles": ["user"],
            "x-hasura-default-role": "user",
            "x-hasura-user-id": `${user.id}`
          }
        },
        privateKey,
        { algorithm: "RS256" }
      );
      return { token };
    },
    login: async (
      _: any,
      data: { email: string; username: string; password: string }
    ) => {
      const { email, password, username } = data;
      const user = await graphql
        .request(LOGIN, { email, username })
        .then((data: any) => {
          return data.users[0];
        });

      if (!user) throw new Error("No such user found.");

      const valid = await bcrypt.compare(password, user.password);
      if (valid) {
        const token = jwt.sign(
          {
            userId: user.id,
            "https://hasura.io/jwt/claims": {
              "x-hasura-allowed-roles": ["user"],
              "x-hasura-default-role": "user",
              "x-hasura-user-id": `${user.id}`
            }
          },
          privateKey,
          { algorithm: "RS256" }
        );

        return { token };
      } else {
        throw new Error("Invalid password.");
      }
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: (data: any) => {
    const { req } = data;
    return {
      ...req
    };
  }
});

server.listen().then((data: any) => {
  const { url } = data;
  console.log(`🚀 Server ready at ${url}`);
});
