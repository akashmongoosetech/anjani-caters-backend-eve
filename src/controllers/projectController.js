import { Project } from '../models/Project.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json(new ApiResponse(200, projects, 'Projects retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getProjectBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const project = await Project.findOne({ slug }).lean();
    if (!project) return next(new ApiError(404, 'Project not found'));
    return res.status(200).json(new ApiResponse(200, project, 'Project details retrieved'));
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    return res.status(201).json(new ApiResponse(201, project, 'Project created successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Project.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return next(new ApiError(404, 'Project not found'));
    return res.status(200).json(new ApiResponse(200, updated, 'Project updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Project.findByIdAndDelete(id);
    return res.status(200).json(new ApiResponse(200, { id }, 'Project deleted successfully'));
  } catch (error) {
    next(error);
  }
};
