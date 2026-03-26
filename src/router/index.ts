import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/Home.vue"),
  },
  {
    path: "/generate",
    name: "generate",
    component: () => import("../views/Generate.vue"),
  },
  {
    path: "/render",
    name: "render",
    component: () => import("../views/Render.vue"),
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
  history: createWebHistory(),
  routes,
});

export default router;
