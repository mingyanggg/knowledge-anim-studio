import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/create",
  },
  {
    path: "/create",
    name: "create",
    component: () => import("../views/Create.vue"),
  },
  {
    path: "/inspiration",
    name: "inspiration",
    component: () => import("../views/Inspiration.vue"),
  },
  {
    path: "/history",
    name: "history",
    component: () => import("../views/History.vue"),
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("../views/Settings.vue"),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
