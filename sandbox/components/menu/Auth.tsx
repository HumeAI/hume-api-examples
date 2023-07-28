import { Environment, parseEnvironment } from "../../lib/utilities/environmentUtilities";
import { createContext, useEffect, useState } from "react";

import { Login } from "./Login";
import { useStorage } from "../../lib/hooks/storage";

type ChildElement = JSX.Element | string;

const AuthContext = createContext<AuthState>({
  key: null,
  environment: Environment.Prod,
  unauthenticate: () => {},
  setEnvironment: (environment: Environment) => {},
});

type AuthState = {
  key: string | null;
  environment: Environment;
  unauthenticate: () => void;
  setEnvironment: (environment: Environment) => void;
};

type AuthProps = {
  children: ChildElement[] | ChildElement;
};

function Auth({ children }: AuthProps) {
  const [auth, setAuth] = useState<AuthState>({
    key: null,
    environment: Environment.Prod,
    unauthenticate: unauthenticate,
    setEnvironment: setEnvironment,
  });
  const [key, setKey, loadKey] = useStorage("hume-key");
  const [env, setEnv, loadEnv] = useStorage("hume-env");

  useEffect(() => {
    if (key) {
      console.log("Got key from session storage");
      setAuth((oldAuth) => ({ ...oldAuth, key }));
    }
    if (env) {
      console.log("Got environment from session storage");
      const environment = parseEnvironment(env);
      setAuth((oldAuth) => ({ ...oldAuth, environment }));
    }
  }, [key, env]);

  function authenticate(key: string): void {
    setKey(key);
    setAuth((oldAuth) => ({ ...oldAuth, key: key }));
  }

  function unauthenticate(): void {
    setKey("");
    setAuth((oldAuth) => ({ ...oldAuth, key: null }));
  }

  function setEnvironment(environment: Environment): void {
    setAuth((oldAuth) => ({ ...oldAuth, environment }));
    setEnv(environment);
  }

  function renderChildren() {
    if (auth.key) return children;
    return <Login authenticate={authenticate}></Login>;
  }

  return <AuthContext.Provider value={auth}>{renderChildren()}</AuthContext.Provider>;
}

export { Auth, AuthContext };
